from sqlalchemy.orm import Session
from app.db.models import Client
from app.schemas.client import ClientCreate, ClientUpdate
from sqlalchemy import or_




def create_client(db: Session, client_data: ClientCreate):

    # CHECK FIRST
    existing = db.query(Client).filter(
        Client.first_name == client_data.first_name,
        Client.last_name == client_data.last_name,
        Client.company_id == client_data.company_id
    ).first()

    if existing:
        raise ValueError("Client already exists")

    client = Client(**client_data.model_dump())

    db.add(client)
    db.commit()
    db.refresh(client)

    return client


def get_client(db: Session, client_id: int):
    client = db.query(Client).filter(Client.id == client_id).first()

    if not client:
        raise ValueError("Client not found")

    return client


def get_clients(
    db: Session,
    company_id: int | None = None,
    search: str | None = None,
    sort: str | None = None,
    skip: int = 0,
    limit: int | None = 10000
):
    query = db.query(Client)

    # Filter by company
    if company_id is not None:
        query = query.filter(Client.company_id == company_id)

    # Search by first OR last name
    if search:
        query = query.filter(
            or_(
                Client.first_name.ilike(f"%{search}%"),
                Client.last_name.ilike(f"%{search}%"),
                Client.address.ilike(f"%{search}%"),
                Client.viber_number.ilike(f"%{search}%")
            )
        )

    # Sorting
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
    

    client_updated_items = client_data.model_dump(exclude_unset=True).items()
    for key, value in client_updated_items:
        setattr(client, key, value)

    db.commit()
    db.refresh(client)

    return client


def delete_client(db: Session, client_id: int):
    client = get_client(db, client_id)

    db.delete(client)
    db.commit()

    return True
