from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import Optional
from app.config.database import get_db
from app.schemas.shoe_catalog import ShoeCatalogCreate, ShoeCatalogRead, ShoeCatalogUpdate
from app.services import shoe_catalog_service

router = APIRouter(prefix="/shoe-management", tags=["Shoe Management"])


@router.get("/shoes", response_model=list[ShoeCatalogRead])
def get_all_shoes(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    return shoe_catalog_service.get_shoe_catalogs(db, skip=skip, limit=limit)


@router.get("/shoes/{shoe_id}", response_model=ShoeCatalogRead)
def get_shoe(shoe_id: int, db: Session = Depends(get_db)):
    shoe = shoe_catalog_service.get_shoe_catalog(db, shoe_id)
    if not shoe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shoe not found")
    return shoe


@router.post("/shoes", response_model=ShoeCatalogRead, status_code=status.HTTP_201_CREATED)
async def create_shoe(
    model_name: str = Form(...),
    price: float = Form(...),
    images: list[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    # Validate image count (1-5)
    if len(images) < 1 or len(images) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must upload between 1 and 5 images"
        )

    # Upload all images (with compression)
    try:
        image_urls = []
        for img in images:
            url = await shoe_catalog_service.upload_shoe_image(img)
            image_urls.append(url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image upload failed: {str(e)}"
        )

    shoe_data = ShoeCatalogCreate(model_name=model_name, price=price)
    shoe = shoe_catalog_service.create_shoe_catalog(db, shoe_data, image_urls)
    if not shoe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create shoe")
    return shoe


@router.patch("/shoes/{shoe_id}", response_model=ShoeCatalogRead)
async def update_shoe(
    shoe_id: int,
    model_name: str = Form(...),
    price: float = Form(...),
    images: Optional[list[UploadFile]] = File(default=None),
    remove_image_ids: str = Form(default=""),
    db: Session = Depends(get_db)
):
    shoe = shoe_catalog_service.get_shoe_catalog(db, shoe_id)
    if not shoe:
        raise HTTPException(status_code=404, detail="Shoe not found")

    # Parse remove_image_ids from comma-separated string
    ids_to_remove = []
    if remove_image_ids.strip():
        try:
            ids_to_remove = [int(x.strip()) for x in remove_image_ids.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid remove_image_ids format")

    # Calculate remaining images after removal
    remaining_count = len([img for img in shoe.images if img.id not in ids_to_remove])

    # Filter out empty file uploads (browser sends empty file when no files selected)
    new_files = []
    if images:
        for img in images:
            if img.filename and img.size > 0:
                new_files.append(img)

    new_count = len(new_files)
    total_after = remaining_count + new_count

    # Validate: must have 1-5 images total
    if total_after < 1:
        raise HTTPException(status_code=400, detail="Shoe must have at least 1 image")
    if total_after > 5:
        raise HTTPException(status_code=400, detail="Shoe cannot have more than 5 images")

    # Upload new images (with compression)
    new_image_urls = []
    if new_files:
        try:
            for img in new_files:
                url = await shoe_catalog_service.upload_shoe_image(img)
                new_image_urls.append(url)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Image upload failed: {str(e)}"
            )

    update_data = ShoeCatalogUpdate(model_name=model_name, price=price)
    updated_shoe = shoe_catalog_service.update_shoe_catalog(
        db, shoe_id, update_data,
        new_image_urls=new_image_urls if new_image_urls else None,
        remove_image_ids=ids_to_remove if ids_to_remove else None
    )

    return updated_shoe


@router.delete("/shoes/{shoe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shoe(shoe_id: int, db: Session = Depends(get_db)):
    success = shoe_catalog_service.delete_shoe_catalog(db, shoe_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shoe not found")
    return None
