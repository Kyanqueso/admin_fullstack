from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.company import CompanyCreate, CompanyRead, CompanyUpdate
from app.services import company_service
from typing import Optional
from fastapi import Query
router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("/", response_model=list[CompanyRead])
def get_all_company(
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 10000,
    db: Session = Depends(get_db)
):
    return company_service.get_companies(
        db,
        search=search,
        sort=sort,
        skip=skip,
        limit=limit
    )


@router.get("/{company_id}", response_model=CompanyRead)
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = company_service.get_company(db, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    return company


@router.post("/", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
def create_company(company_data: CompanyCreate, db: Session = Depends(get_db)):
    company = company_service.create_company(db, company_data)
    if not company:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create Company")

    return company


@router.patch("/{company_id}", response_model=CompanyRead)
def update_company(company_id: int, company_data: CompanyUpdate, db: Session = Depends(get_db)):
    company = company_service.update_company(db, company_id, company_data)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(company_id: int, db: Session = Depends(get_db)):
    success = company_service.delete_company(db, company_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    return None
