from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.db.schema import Client
from app.model.local.client import ClientGet, ClientCreate, ClientUpdate


def get_all_clients(db: Session) -> list[ClientGet]:
    """Retrieve all clients from the database."""
    clients = db.query(Client).all()
    return [ClientGet.model_validate(client) for client in clients]


def get_client_by_id(db: Session, client_id: int) -> ClientGet | None:
    """Retrieve a single client by ID."""
    client = db.query(Client).filter(Client.id == client_id).first()
    return ClientGet.model_validate(client) if client else None


def create_client(db: Session, client: ClientCreate) -> ClientGet:
    """Create a new client."""
    try:
        db_client = Client(
            company_id=client.company_id,
            first_name=client.first_name,
            last_name=client.last_name,
            role="client",
            address=client.address,
            viber_number=client.viber_number,
            notes=client.notes,
        )

        db.add(db_client)
        db.commit()
        db.refresh(db_client)

        return ClientGet.model_validate(db_client)

    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Failed to create client: {str(e)}")


def update_client(
        db: Session,
        client_id: int,
        client_update: ClientUpdate,
) -> ClientGet | None:
    """Update an existing client."""
    try:
        client = db.query(Client).filter(Client.id == client_id).first()

        if not client:
            return None

        # Only update fields that were actually provided
        update_data = client_update.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(client, field, value)

        # updated_at will be set automatically by SQLAlchemy's onupdate

        db.commit()
        db.refresh(client)

        return ClientGet.model_validate(client)

    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Failed to update client: {str(e)}")


def delete_client(db: Session, client_id: int) -> bool:
    """Delete a client by ID."""
    try:
        client = db.query(Client).filter(Client.id == client_id).first()

        if not client:
            return False

        db.delete(client)
        db.commit()

        return True

    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Failed to delete client: {str(e)}")
