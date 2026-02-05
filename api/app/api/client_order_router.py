from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.client_order import ClientOrderCreate, ClientOrderRead, ClientOrderUpdate
from app.services import client_order_service

router = APIRouter(prefix="/client-orders", tags=["Client Orders"])


@router.get("/", response_model=list[ClientOrderRead])
def get_all_client_order(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    return client_order_service.get_client_orders(db, skip=skip, limit=limit)


@router.get("/{client_order_id}", response_model=ClientOrderRead)
def get_client_order(client_order_id: int, db: Session = Depends(get_db)):
    client_order = client_order_service.get_client_order(db, client_order_id)
    if not client_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client Order not found")

    return client_order


@router.post("/", response_model=ClientOrderRead, status_code=status.HTTP_201_CREATED)
def create_client_order(client_order_data: ClientOrderCreate, db: Session = Depends(get_db)):
    client_order = client_order_service.create_client_order(db, client_order_data)
    if not client_order:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create Client Order")

    return client_order


@router.patch("/{client_order_id}", response_model=ClientOrderRead)
def update_client_order(client_order_id: int, client_order_data: ClientOrderUpdate, db: Session = Depends(get_db)):
    client_order = client_order_service.update_client_order(db, client_order_id, client_order_data)
    if not client_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client Order not found")

    return client_order


@router.delete("/{client_order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client_order(client_order_id: int, db: Session = Depends(get_db)):
    success = client_order_service.delete_client_order(db, client_order_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client Order not found")

    return None
