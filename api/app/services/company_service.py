from sqlalchemy.orm import Session
from app.db.models import Company
from app.schemas.company import CompanyCreate, CompanyUpdate


def create_company(db: Session, company_data: CompanyCreate):
    existing = db.query(Company).filter(
        Company.name.ilike(company_data.name.strip()),
        Company.isDeleted == False
    ).first()

    if existing:
        raise ValueError("Company already exists")

    company = Company(**company_data.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)

    return company


def get_company(db: Session, company_id: int):
    return db.query(Company).filter(
        Company.id == company_id,
        Company.isDeleted == False
    ).first()


def get_companies(
    db: Session,
    search: str | None = None,
    sort: str | None = None,
    skip: int = 0,
    limit: int | None = 10000,
    archived: bool = False
):
    query = db.query(Company).filter(Company.isDeleted == archived)

    if search:
        query = query.filter(Company.name.ilike(f"%{search}%"))

    if sort == "az":
        query = query.order_by(Company.name.asc())
    elif sort == "za":
        query = query.order_by(Company.name.desc())
    elif sort == "recent":
        query = query.order_by(Company.id.desc())
    elif sort == "oldest":
        query = query.order_by(Company.id.asc())

    query = query.offset(skip)

    if limit is not None:
        query = query.limit(limit)

    return query.all()


def update_company(db: Session, company_id: int, company_data: CompanyUpdate):
    company = get_company(db, company_id)
    if not company:
        return None

    for key, value in company_data.model_dump(exclude_unset=True).items():
        setattr(company, key, value)

    db.commit()
    db.refresh(company)

    return company

# Un-archive a company and all its clients and orders as well
def restore_company(db: Session, company_id: int):
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.isDeleted == True
    ).first()

    if not company:
        raise ValueError("Archived company not found")

    for client in company.clients:
        for order in client.client_orders:
            if order.payment_summary:
                for tx in order.payment_summary.payment_transactions:
                    tx.isDeleted = False
                order.payment_summary.isDeleted = False
            order.isDeleted = False
        client.isDeleted = False

    company.isDeleted = False
    db.commit()

    return company


def hard_delete_company(db: Session, company_id: int):
    company = db.query(Company).filter(Company.id == company_id).first()

    if not company:
        raise ValueError("Company not found")

    # Triple for loop to delete the company's clients, and all orders under those clients, 
    # along with payment summaries and transactions linked to those orders FIRST, 
    # due to foreign key constraints.
    for client in company.clients:
        for order in client.client_orders:
            if order.payment_summary:
                for tx in order.payment_summary.payment_transactions:
                    db.delete(tx)
                db.flush()
                db.delete(order.payment_summary)
                db.flush()
            db.delete(order)
        db.flush()
        db.delete(client)

    # Finally delete the company itself
    db.flush()
    db.delete(company)
    db.commit()

    return True


def delete_company(db: Session, company_id: int):
    company = get_company(db, company_id)
    if not company:
        return None

    for client in company.clients:
        for order in client.client_orders:
            if order.payment_summary:
                for tx in order.payment_summary.payment_transactions:
                    tx.isDeleted = True
                order.payment_summary.isDeleted = True
            order.isDeleted = True
        client.isDeleted = True

    company.isDeleted = True
    db.commit()

    return True