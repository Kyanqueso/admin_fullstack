from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config.sqlite_config import get_db
from app.model.local.company import CompanyCreate, CompanyGet, CompanyUpdate
from app.services.local.company_service import (
    get_all_companies,
    get_company_by_id,
    create_company,
    update_company,
    delete_company,
)

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("/", response_model=list[CompanyGet])
def get_companies(db: Session = Depends(get_db)):
    return get_all_companies(db)


@router.get("/{company_id}", response_model=CompanyGet)
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )
    return company


@router.post("/", response_model=CompanyGet, status_code=status.HTTP_201_CREATED)
def create_company_endpoint(
    company: CompanyCreate,
    db: Session = Depends(get_db),
):
    return create_company(db=db, company=company)


@router.patch("/{company_id}", response_model=CompanyGet)
def update_company_endpoint(
    company_id: int,
    company_update: CompanyUpdate,
    db: Session = Depends(get_db),
):
    updated_company = update_company(
        db=db,
        company_id=company_id,
        company_update=company_update,
    )

    if not updated_company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return updated_company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company_endpoint(
    company_id: int,
    db: Session = Depends(get_db),
):
    deleted = delete_company(db=db, company_id=company_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )