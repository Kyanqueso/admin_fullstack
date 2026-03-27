from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.client_order import ClientOrderCreate, ClientOrderRead, ClientOrderUpdate
from app.services import client_order_service
from app.db.models import CompletedOrder

router = APIRouter(prefix="/client-orders", tags=["Client Orders"])


@router.get("/")
def get_all_client_order(
        skip: int = 0,
        limit: int = 10000,
        completed: bool | None = None,
        db: Session = Depends(get_db)
):
    try:
        return client_order_service.get_client_orders(
            db,
            skip=skip,
            limit=limit,
            completed=completed
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{client_order_id}", response_model=ClientOrderRead)
def get_client_order(client_order_id: int, db: Session = Depends(get_db)):
    try:
        return client_order_service.get_client_order(db, client_order_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/", response_model=ClientOrderRead, status_code=status.HTTP_201_CREATED)
def create_client_order(client_order_data: ClientOrderCreate, db: Session = Depends(get_db)):
    try:
        return client_order_service.create_client_order(db, client_order_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/{client_order_id}", response_model=ClientOrderRead)
def update_client_order(client_order_id: int, client_order_data: ClientOrderUpdate, db: Session = Depends(get_db)):
    try:
        return client_order_service.update_client_order(db, client_order_id, client_order_data)
    except ValueError as e:
        detail = str(e)
        if "not found" in detail.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/{client_order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client_order(client_order_id: int, db: Session = Depends(get_db)):
    try:
        client_order_service.delete_client_order(db, client_order_id)
        return None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

