import uuid
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
    """Uploads an image to Supabase storage and returns the public URL."""
    file_ext = image.filename.split(".")[-1].lower()
    allowed_ext = ["jpg", "jpeg", "png", "webp"]

    if file_ext not in allowed_ext:
        raise ValueError("Unsupported file type")

    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_content = await image.read()

    supabase.storage.from_("shoe_images").upload(
        path=file_name,
        file=file_content,
        file_options={"content-type": image.content_type}
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
