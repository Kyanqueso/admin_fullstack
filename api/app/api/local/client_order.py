from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config.sqlite_config import get_db
from app.model.local.client_order import (
    ClientOrderGet,
    ClientOrderCreate,
    ClientOrderUpdate,
)
from app.services.local.client_order_service import (
    get_all_client_orders,
    get_client_order_by_id,
    create_client_order,
    update_client_order,
    delete_client_order,
)

router = APIRouter(prefix="/client-orders", tags=["Client Orders"])

@router.get("/", response_model=list[ClientOrderGet])
def get_client_orders(db: Session = Depends(get_db)):
    return get_all_client_orders(db)

@router.get("/{client_order_id}", response_model=ClientOrderGet)
def get_client_order(client_order_id: int, db: Session = Depends(get_db)):
    client_order = get_client_order_by_id(db, client_order_id)
    if not client_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client order not found",
        )
    return client_order


@router.post("/", response_model=ClientOrderGet, status_code=status.HTTP_201_CREATED)
def create_client_order_endpoint(
    order: ClientOrderCreate,
    db: Session = Depends(get_db),
):
    return create_client_order(db, order)


@router.patch("/{client_order_id}", response_model=ClientOrderGet)
def update_client_order_endpoint(
    client_order_id: int,
    order_update: ClientOrderUpdate,
    db: Session = Depends(get_db),
):
    updated_order = update_client_order(db, client_order_id, order_update)

    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client order not found",
        )

    return updated_order


@router.delete("/{client_order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client_order_endpoint(
    client_order_id: int,
    db: Session = Depends(get_db),
):
    success = delete_client_order(db, client_order_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client order not found",
        )
