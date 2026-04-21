from sqlalchemy.orm import Session
from app.db.models import Company, Client, Person, ClientOrder, PaymentSummary, PaymentTransaction
from app.schemas.company import CompanyCreate, CompanyUpdate


def create_company(db: Session, company_data: CompanyCreate):
    existing = db.query(Company).filter(
        Company.name.ilike(company_data.name.strip())
    ).first()

    if existing:
        raise ValueError("A company with this name already exists")

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

    update_data = company_data.model_dump(exclude_unset=True)

    if "name" in update_data:
        conflict = db.query(Company).filter(
            Company.name.ilike(update_data["name"].strip()),
            Company.id != company_id
        ).first()
        if conflict:
            raise ValueError("A company with this name already exists")

    for key, value in update_data.items():
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

    conflict = db.query(Company).filter(
        Company.name.ilike(company.name),
        Company.isDeleted == False
    ).first()
    if conflict:
        raise ValueError("An active company with this name already exists")

    client_ids = [
        r for (r,) in db.query(Client.id).filter(Client.company_id == company_id).all()
    ]

    if client_ids:
        order_ids = [
            r for (r,) in db.query(ClientOrder.id)
            .filter(ClientOrder.client_id.in_(client_ids)).all()
        ]

        if order_ids:
            summary_ids = [
                r for (r,) in db.query(PaymentSummary.id)
                .filter(PaymentSummary.client_order_id.in_(order_ids)).all()
            ]

            if summary_ids:
                db.query(PaymentTransaction).filter(
                    PaymentTransaction.payment_summary_id.in_(summary_ids)
                ).update({"isDeleted": False}, synchronize_session=False)

            db.query(PaymentSummary).filter(
                PaymentSummary.client_order_id.in_(order_ids)
            ).update({"isDeleted": False}, synchronize_session=False)

            db.query(ClientOrder).filter(
                ClientOrder.client_id.in_(client_ids)
            ).update({"isDeleted": False}, synchronize_session=False)

        db.query(Person).filter(
            Person.id.in_(client_ids)
        ).update({"isDeleted": False}, synchronize_session=False)

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

    # Collect IDs in bulk — one query per level, no ORM object loading
    client_ids = [
        r for (r,) in db.query(Client.id).filter(Client.company_id == company_id).all()
    ]

    if client_ids:
        order_ids = [
            r for (r,) in db.query(ClientOrder.id)
            .filter(ClientOrder.client_id.in_(client_ids)).all()
        ]

        if order_ids:
            summary_ids = [
                r for (r,) in db.query(PaymentSummary.id)
                .filter(PaymentSummary.client_order_id.in_(order_ids)).all()
            ]

            if summary_ids:
                db.query(PaymentTransaction).filter(
                    PaymentTransaction.payment_summary_id.in_(summary_ids)
                ).update({"isDeleted": True}, synchronize_session=False)

            db.query(PaymentSummary).filter(
                PaymentSummary.client_order_id.in_(order_ids)
            ).update({"isDeleted": True}, synchronize_session=False)

            db.query(ClientOrder).filter(
                ClientOrder.client_id.in_(client_ids)
            ).update({"isDeleted": True}, synchronize_session=False)

        # isDeleted lives on persons table (joined-table inheritance)
        db.query(Person).filter(
            Person.id.in_(client_ids)
        ).update({"isDeleted": True}, synchronize_session=False)

    company.isDeleted = True
    db.commit()

    return True