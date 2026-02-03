from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.client import ClientCreate, ClientRead, ClientUpdate
from app.services import client_service

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("/", response_model=list[ClientRead])
def get_all_client(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    return client_service.get_clients(db, skip=skip, limit=limit)


@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = client_service.get_client(db, client_id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    return client


@router.post("/", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(client_data: ClientCreate, db: Session = Depends(get_db)):
    client = client_service.create_client(db, client_data)
    if not client:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create Client")

    return client


@router.patch("/{client_id}", response_model=ClientRead)
def update_client(client_id: int, client_data: ClientUpdate, db: Session = Depends(get_db)):
    client = client_service.update_client(db, client_id, client_data)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: int, db: Session = Depends(get_db)):
    success = client_service.delete_client(db, client_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    return None
