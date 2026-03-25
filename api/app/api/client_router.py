from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.client import ClientCreate, ClientRead, ClientUpdate
from app.services import client_service
from typing import Optional
from fastapi import Query

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("/", response_model=list[ClientRead])
def get_all_client(
    company_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 10000,
    db: Session = Depends(get_db)
):
    return client_service.get_clients(
        db,
        company_id=company_id,
        search=search,
        sort=sort,
        skip=skip,
        limit=limit
    )


@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db)):
    try:
        return client_service.get_client(db, client_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(client_data: ClientCreate, db: Session = Depends(get_db)):
    try:
        return client_service.create_client(db, client_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{client_id}", response_model=ClientRead)
def update_client(client_id: int, client_data: ClientUpdate, db: Session = Depends(get_db)):
    
    if not client_data.model_dump(exclude_unset=True):
        raise HTTPException(status_code=400, detail="No data provided for update")

    try:
        return client_service.update_client(db, client_id, client_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: int, db: Session = Depends(get_db)):
    try:
        client_service.delete_client(db, client_id)
        return None
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
