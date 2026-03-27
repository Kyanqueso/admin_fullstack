from sqlalchemy.orm import Session
from app.db.models import Company
from app.schemas.company import CompanyCreate, CompanyUpdate


def create_company(db: Session, company_data: CompanyCreate):

    # ADDED
    existing = db.query(Company).filter(
        Company.name.ilike(company_data.name.strip())
    ).first()

    if existing:
        raise ValueError("Company already exists")

    company = Company(**company_data.model_dump())

    db.add(company)
    db.commit()
    db.refresh(company)

    return company


def get_company(db: Session, company_id: int):
    return db.query(Company).filter(Company.id == company_id).first()


def get_companies(
    db: Session,
    search: str | None = None,
    sort: str | None = None,
    skip: int = 0,
    limit: int | None = 103000
):
    query = db.query(Company)

    
    if search:
        query = query.filter(Company.name.ilike(f"%{search}%"))

    
    # Sorting
    if sort == "az":
        query = query.order_by(Company.name.asc())

    elif sort == "za":
        query = query.order_by(Company.name.desc())

    elif sort == "recent":
        query = query.order_by(Company.id.desc())

    elif sort == "oldest":
        query = query.order_by(Company.id.asc())

    if limit is not None:
        query = query.limit(limit)

    return query.all()


def update_company(db: Session, company_id: int, company_data: CompanyUpdate):
    company = get_company(db, company_id)
    if not company:
        return None

    company_updated_items = company_data.model_dump(exclude_unset=True).items()
    for key, value in company_updated_items:
        setattr(company, key, value)

    db.commit()
    db.refresh(company)

    return company


def delete_company(db: Session, company_id: int):
    company = get_company(db, company_id)
    if not company:
        return None

    db.delete(company)
    db.commit()

    return True
