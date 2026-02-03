from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
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
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        image_url = await shoe_catalog_service.upload_shoe_image(image)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Image upload failed: {str(e)}")

    shoe_data = ShoeCatalogCreate(model_name=model_name, price=price, image_url=image_url)
    shoe = shoe_catalog_service.create_shoe_catalog(db, shoe_data)
    if not shoe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create shoe")
    return shoe


@router.patch("/shoes/{shoe_id}", response_model=ShoeCatalogRead)
def update_shoe(shoe_id: int, shoe_data: ShoeCatalogUpdate, db: Session = Depends(get_db)):
    shoe = shoe_catalog_service.update_shoe_catalog(db, shoe_id, shoe_data)
    if not shoe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shoe not found")
    return shoe


@router.delete("/shoes/{shoe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shoe(shoe_id: int, db: Session = Depends(get_db)):
    success = shoe_catalog_service.delete_shoe_catalog(db, shoe_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shoe not found")
    return None
