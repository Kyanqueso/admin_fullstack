from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config.sqlite_config import get_db
from app.model.local.client import (
    ClientGet,
    ClientCreate,
    ClientUpdate,
)
from app.services.local.client_service import (
    get_all_clients,
    get_client_by_id,
    create_client,
    update_client,
    delete_client,
)

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("/", response_model=list[ClientGet])
def get_clients(db: Session = Depends(get_db)):
    return get_all_clients(db)


@router.get("/{client_id}", response_model=ClientGet)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = get_client_by_id(db, client_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return client


@router.post("/", response_model=ClientGet, status_code=status.HTTP_201_CREATED)
def create_client_endpoint(
        client: ClientCreate,
        db: Session = Depends(get_db),
):
    return create_client(db, client)


@router.patch("/{client_id}", response_model=ClientGet)
def update_client_endpoint(
        client_id: int,
        client_update: ClientUpdate,
        db: Session = Depends(get_db),
):
    updated_client = update_client(db, client_id, client_update)

    if not updated_client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )

    return updated_client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client_endpoint(
        client_id: int,
        db: Session = Depends(get_db),
):
    success = delete_client(db, client_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
