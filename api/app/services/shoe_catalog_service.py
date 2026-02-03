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

    shoe_updated_items = shoe_data.model_dump(exclude_unset=True).items()
    for key, value in shoe_updated_items:
        setattr(shoe, key, value)

    db.commit()
    db.refresh(shoe)
    return shoe


def delete_shoe_catalog(db: Session, shoe_id: int):
    shoe = get_shoe_catalog(db, shoe_id)
    if not shoe:
        return None

    db.delete(shoe)
    db.commit()
    return True


async def upload_shoe_image(image: UploadFile) -> str:
    """Upload image to Supabase storage and return public URL."""
    file_ext = image.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_content = await image.read()

    supabase.storage.from_("shoe_images").upload(
        path=file_name,
        file=file_content,
        file_options={"content-type": image.content_type}
    )

    return supabase.storage.from_("shoe_images").get_public_url(file_name)
