import uuid
import io
from PIL import Image
from sqlalchemy.orm import Session, subqueryload
from fastapi import UploadFile
from app.db.models import ShoeCatalog, ShoeImage
from app.schemas.shoe_catalog import ShoeCatalogCreate, ShoeCatalogUpdate
from app.config.database import supabase


def create_shoe_catalog(db: Session, shoe_data: ShoeCatalogCreate, image_urls: list[str]):
    shoe = ShoeCatalog(
        model_name=shoe_data.model_name,
        price=shoe_data.price
    )
    db.add(shoe)
    db.flush()  # get shoe.id without committing

    for i, url in enumerate(image_urls):
        img = ShoeImage(shoe_catalog_id=shoe.id, image_url=url, display_order=i + 1)
        db.add(img)

    db.commit()
    db.refresh(shoe)
    return shoe


def get_shoe_catalog(db: Session, shoe_id: int):
    return (
        db.query(ShoeCatalog)
        .options(subqueryload(ShoeCatalog.images))
        .filter(ShoeCatalog.id == shoe_id)
        .first()
    )


def get_shoe_catalogs(db: Session, skip: int = 0, limit: int | None = 10000):
    query = (
        db.query(ShoeCatalog)
        .options(subqueryload(ShoeCatalog.images))
        .offset(skip)
    )
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def update_shoe_catalog(
    db: Session,
    shoe_id: int,
    shoe_data: ShoeCatalogUpdate,
    new_image_urls: list[str] | None = None,
    remove_image_ids: list[int] | None = None
):
    shoe = get_shoe_catalog(db, shoe_id)
    if not shoe:
        return None

    # Update text fields
    if shoe_data.model_name is not None:
        shoe.model_name = shoe_data.model_name
    if shoe_data.price is not None:
        shoe.price = shoe_data.price

    # Remove specified images
    if remove_image_ids:
        for img in list(shoe.images):
            if img.id in remove_image_ids:
                delete_shoe_image(img.image_url)
                db.delete(img)

    # Add new images
    if new_image_urls:
        current_max = max((img.display_order for img in shoe.images if img.id not in (remove_image_ids or [])), default=0)
        for i, url in enumerate(new_image_urls):
            img = ShoeImage(shoe_catalog_id=shoe.id, image_url=url, display_order=current_max + i + 1)
            db.add(img)

    db.commit()
    db.refresh(shoe)
    return shoe


def delete_shoe_catalog(db: Session, shoe_id: int):
    shoe = get_shoe_catalog(db, shoe_id)
    if not shoe:
        return None

    # Delete all images from Supabase storage
    for img in shoe.images:
        delete_shoe_image(img.image_url)

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
