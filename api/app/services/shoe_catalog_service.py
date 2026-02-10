import uuid
import io
from PIL import Image
from sqlalchemy.orm import Session
from fastapi import UploadFile
from app.db.models import ShoeCatalog
from app.schemas.shoe_catalog import ShoeCatalogCreate, ShoeCatalogUpdate
from app.config.database import supabase


def create_shoe_catalog(db: Session, shoe_data: ShoeCatalogCreate):
    shoe = ShoeCatalog(**shoe_data.model_dump())
    db.add(shoe)
    db.commit()
    db.refresh(shoe)
    return shoe


def get_shoe_catalog(db: Session, shoe_id: int):
    return db.query(ShoeCatalog).filter(ShoeCatalog.id == shoe_id).first()


def get_shoe_catalogs(db: Session, skip: int = 0, limit: int | None = 10000):
    query = db.query(ShoeCatalog).offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def update_shoe_catalog(db: Session, shoe_id: int, shoe_data: ShoeCatalogUpdate):
    shoe = get_shoe_catalog(db, shoe_id)

    if not shoe:
        return None

    shoe.model_name = shoe_data.model_name
    shoe.price = shoe_data.price
    shoe.image_url = shoe_data.image_url

    db.commit()
    db.refresh(shoe)

    return shoe


def delete_shoe_catalog(db: Session, shoe_id: int):
    shoe = get_shoe_catalog(db, shoe_id)
    
    if not shoe:
        return None

    # delete image in supabase storage
    if shoe.image_url:
        delete_shoe_image(shoe.image_url)

    db.delete(shoe)
    db.commit()

    return True



async def upload_shoe_image(image: UploadFile) -> str:
    """
    Compresses image to WebP, uploads to Supabase, and logs compression stats.
    """
    # Validate extension
    file_ext = image.filename.split(".")[-1].lower()
    allowed_ext = ["jpg", "jpeg", "png", "webp"]

    if file_ext not in allowed_ext:
        raise ValueError("Unsupported file type")

    # Read file content
    file_content = await image.read()
    original_size = len(file_content)  # Size in bytes

    # Compress and Resize Logic
    try:
        # Open image from bytes
        img = Image.open(io.BytesIO(file_content))
        
        # Resize: Restrict max dimension to 1024px (preserves aspect ratio)
        img.thumbnail((1024, 1024))

        # Save compressed image to a memory buffer
        output_buffer = io.BytesIO()
        
        # Save as WebP with quality=70
        img.save(output_buffer, format="WEBP", quality=70, optimize=True)
        
        # Get the compressed bytes
        compressed_data = output_buffer.getvalue()
        compressed_size = len(compressed_data)  # New size in bytes
        
        # --- MONITORING LOGS ---
        reduction = (1 - (compressed_size / original_size)) * 100
        print("-" * 30)
        print(f"📸 Image Compression Stats:")
        print(f"   Original Size:   {original_size / 1024:.2f} KB")
        print(f"   Compressed Size: {compressed_size / 1024:.2f} KB")
        print(f"   Space Saved:     {reduction:.2f}% 📉")
        print("-" * 30)
        # -----------------------

        # Prepare for upload
        file_name = f"{uuid.uuid4()}.webp"
        content_type = "image/webp"
        data_to_upload = compressed_data

    except Exception as e:
        print(f"⚠️ Compression failed: {e}")
        print("   Uploading original file instead.")
        
        # Fallback to original if compression fails
        data_to_upload = file_content
        file_name = f"{uuid.uuid4()}.{file_ext}"
        content_type = image.content_type

    # Upload to Supabase
    supabase.storage.from_("shoe_images").upload(
        path=file_name,
        file=data_to_upload,
        file_options={"content-type": content_type}
    )

    return supabase.storage.from_("shoe_images").get_public_url(file_name)

def extract_filename_from_url(url: str) -> str:
    return url.split("/")[-1].split("?")[0]

def delete_shoe_image(image_url: str):
    try:
        filename = extract_filename_from_url(image_url)

        supabase.storage.from_("shoe_images").remove([filename])

    except Exception as e:
        print("Failed to delete image:", e)
