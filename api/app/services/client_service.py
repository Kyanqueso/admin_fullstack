from sqlalchemy.orm import Session
from app.db.models import Client, Company
from app.schemas.client import ClientCreate, ClientUpdate
from sqlalchemy import or_


def create_client(db: Session, client_data: ClientCreate):
    company = db.query(Company).filter(
        Company.id == client_data.company_id,
        Company.isDeleted == False
    ).first()
    if not company:
        raise ValueError("Company not found or is archived.")

    existing = db.query(Client).filter(
        Client.first_name == client_data.first_name,
        Client.last_name == client_data.last_name,
        Client.company_id == client_data.company_id,
        Client.isDeleted == False
    ).first()

    if existing:
        raise ValueError("Client already exists")

    client = Client(**client_data.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)

    return client


def get_client(db: Session, client_id: int):
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.isDeleted == False
    ).first()

    if not client:
        raise ValueError("Client not found")

    return client


def get_clients(
    db: Session,
    company_id: int | None = None,
    search: str | None = None,
    sort: str | None = None,
    skip: int = 0,
    limit: int | None = 10000,
    archived: bool = False
):
    query = db.query(Client).filter(Client.isDeleted == archived)

    if company_id is not None:
        query = query.filter(Client.company_id == company_id)

    if search:
        query = query.filter(
            or_(
                Client.first_name.ilike(f"%{search}%"),
                Client.last_name.ilike(f"%{search}%"),
                Client.address.ilike(f"%{search}%"),
                Client.viber_number.ilike(f"%{search}%")
            )
        )

    if sort == "az":
        query = query.order_by(Client.first_name.asc())
    elif sort == "za":
        query = query.order_by(Client.first_name.desc())
    elif sort == "recent":
        query = query.order_by(Client.id.desc())
    elif sort == "oldest":
        query = query.order_by(Client.id.asc())

    query = query.offset(skip)

    if limit is not None:
        query = query.limit(limit)

    return query.all()


def update_client(db: Session, client_id: int, client_data: ClientUpdate):
    client = get_client(db, client_id)

    for key, value in client_data.model_dump(exclude_unset=True).items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)

    return client

# Un-archive a client and all its orders as well
def restore_client(db: Session, client_id: int):
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.isDeleted == True
    ).first()

    if not client:
        raise ValueError("Archived client not found")

    duplicate = db.query(Client).filter(
        Client.first_name == client.first_name,
        Client.last_name == client.last_name,
        Client.company_id == client.company_id,
        Client.isDeleted == False
    ).first()
    if duplicate:
        raise ValueError("An active client with this name already exists.")

    for order in client.client_orders:
        if order.payment_summary:
            for tx in order.payment_summary.payment_transactions:
                tx.isDeleted = False
            order.payment_summary.isDeleted = False
        order.isDeleted = False

    client.isDeleted = False
    db.commit()

    return client

# Soft Delete: client and all their orders are marked as deleted but remain in the database
def delete_client(db: Session, client_id: int):
    client = get_client(db, client_id)

    for order in client.client_orders:
        if order.payment_summary:
            for tx in order.payment_summary.payment_transactions:
                tx.isDeleted = True
            order.payment_summary.isDeleted = True
        order.isDeleted = True

    client.isDeleted = True
    db.commit()

    return True

# Hard Delete: client, all their orders, payment summaries, and transactions are permanently removed from the database.
def hard_delete_client(db: Session, client_id: int):
    client = db.query(Client).filter(Client.id == client_id).first()

    if not client:
        raise ValueError("Client not found")

    # First delete all orders under this client, along with their payment summaries and transactions, due to foreign key constraints. Then delete the client itself.
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
    db.commit()

    return True