from sqlalchemy.orm import Session
from app.db.schema import Company
from app.model.local.company import CompanyGet, CompanyCreate, CompanyUpdate
from sqlalchemy.exc import SQLAlchemyError


def get_all_companies(db: Session) -> list[CompanyGet]:
    """Retrieve all companies from the database."""
    companies = db.query(Company).all()
    return [CompanyGet.model_validate(company) for company in companies]

def get_company_by_id(db: Session, company_id: int) -> CompanyGet | None:
    """Retrieve a single company by ID."""
    company = db.query(Company).filter(Company.company_id == company_id).first()
    return CompanyGet.model_validate(company) if company else None


def create_company(db: Session, company: CompanyCreate) -> CompanyGet:
    """Create a new company."""
    try:
        db_company = Company(
            name=company.name,
            address=company.address,
        )

        db.add(db_company)
        db.commit()
        db.refresh(db_company)

        return CompanyGet.model_validate(db_company)

    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Failed to create company: {str(e)}")


def update_company(
        db: Session,
        company_id: int,
        company_update: CompanyUpdate,
) -> CompanyGet | None:
    """Update an existing company."""
    try:
        company = db.query(Company).filter(Company.company_id == company_id).first()

        if not company:
            return None

        # Use Pydantic's exclude_unset to only update provided fields
        update_data = company_update.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(company, field, value)

        db.commit()
        db.refresh(company)

        return CompanyGet.model_validate(company)

    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Failed to update company: {str(e)}")


def delete_company(db: Session, company_id: int) -> bool:
    """Delete a company by ID."""
    try:
        company = db.query(Company).filter(Company.company_id == company_id).first()

        if not company:
            return False

        db.delete(company)
        db.commit()
        # Don't refresh after delete!

        return True

    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Failed to delete company: {str(e)}")
