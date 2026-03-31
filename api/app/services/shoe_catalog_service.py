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


def get_shoe_catalogs(db: Session, skip: int = 0, limit: int | None = 10000, visible_only: bool = False):
    query = (
        db.query(ShoeCatalog)
        .options(subqueryload(ShoeCatalog.images))
        .offset(skip)
    )
    if visible_only:
        query = query.filter(ShoeCatalog.is_visible == True)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def toggle_shoe_visibility(db: Session, shoe_id: int):
    shoe = get_shoe_catalog(db, shoe_id)
    if not shoe:
        return None
    shoe.is_visible = not shoe.is_visible
    db.commit()
    db.refresh(shoe)
    return shoe


def update_shoe_catalog(
    db: Session,
    shoe_id: int,
    shoe_data: ShoeCatalogUpdate,
    new_image_urls: list[str] | None = None,
    remove_image_ids: list[int] | None = None,
    image_order: list[int] | None = None
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

    # Apply custom display_order to remaining existing images
    if image_order:
        id_to_img = {img.id: img for img in shoe.images if img.id not in (remove_image_ids or [])}
        for position, img_id in enumerate(image_order, start=1):
            if img_id in id_to_img:
                id_to_img[img_id].display_order = position
        next_position = len(image_order) + 1
    else:
        next_position = max(
            (img.display_order for img in shoe.images if img.id not in (remove_image_ids or [])),
            default=0
        ) + 1

    # Add new images (appended after the reordered existing ones)
    if new_image_urls:
        for i, url in enumerate(new_image_urls):
            img = ShoeImage(shoe_catalog_id=shoe.id, image_url=url, display_order=next_position + i)
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
    Validates, compresses, and uploads an image to Supabase as WebP.
    Performs magic-bytes check so renamed non-image files (.exe, .wav, etc.) are rejected.
    """
    # Validate extension
    file_ext = image.filename.split(".")[-1].lower()
    allowed_ext = ["jpg", "jpeg", "png", "webp"]

    if file_ext not in allowed_ext:
        raise ValueError("Unsupported file type. Only JPG, PNG, and WebP are accepted.")

    MAX_SIZE = 25 * 1024 * 1024  # 25 MB
    if image.size and image.size > MAX_SIZE:
        raise ValueError("Image must be 25 MB or smaller")

    # Read file content
    file_content = await image.read()
    if len(file_content) > MAX_SIZE:
        raise ValueError("Image must be 25 MB or smaller")

    # Validate magic bytes — catches files renamed to a valid image extension
    # (e.g. malware.exe renamed to photo.jpg, or audio.wav renamed to photo.jpg)
    header = file_content[:12]
    is_jpeg = header[:3] == b'\xff\xd8\xff'
    is_png  = header[:4] == b'\x89PNG'
    is_webp = header[:4] == b'RIFF' and header[8:12] == b'WEBP'
    if not (is_jpeg or is_png or is_webp):
        raise ValueError(
            f"'{image.filename}' is not a valid image file. "
            "Only JPEG, PNG, and WebP content is accepted."
        )

    original_size = len(file_content)

    # Compress and convert to WebP
    try:
        img = Image.open(io.BytesIO(file_content))
        img.thumbnail((1024, 1024))

        output_buffer = io.BytesIO()
        img.save(output_buffer, format="WEBP", quality=70, optimize=True)
        compressed_data = output_buffer.getvalue()
        compressed_size = len(compressed_data)

        reduction = (1 - (compressed_size / original_size)) * 100
        print("-" * 30)
        print(f"📸 Image Compression Stats:")
        print(f"   Original Size:   {original_size / 1024:.2f} KB")
        print(f"   Compressed Size: {compressed_size / 1024:.2f} KB")
        print(f"   Space Saved:     {reduction:.2f}% 📉")
        print("-" * 30)

        file_name = f"{uuid.uuid4()}.webp"
        content_type = "image/webp"
        data_to_upload = compressed_data

    except Exception as e:
        # Do NOT fall back — a file that Pillow cannot open is not a valid image
        raise ValueError(f"Failed to process '{image.filename}': {str(e)}")

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
