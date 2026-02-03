from sqlalchemy.orm import Session
from app.db.models import ClientOrder
from app.schemas.client_order import ClientOrderCreate, ClientOrderUpdate


def create_client_order(db: Session, client_order_data: ClientOrderCreate):
    client_order = ClientOrder(**client_order_data.model_dump())

    db.add(client_order)
    db.commit()
    db.refresh(client_order)

    return client_order


def get_client_order(db: Session, client_order_id: int):
    return db.query(ClientOrder).filter(ClientOrder.id == client_order_id).first()


def get_client_orders(db: Session, skip: int = 0, limit: int | None = 10000):
    query = db.query(ClientOrder).offset(skip)
    if limit is not None:
        query = query.limit(limit)

    return query.all()


# For Later: get_all_client_orders_of client by_client_id

def update_client_order(db: Session, client_order_id: int, client_order_data: ClientOrderUpdate):
    client_order = get_client_order(db, client_order_id)
    if not client_order:
        return None

    client_order_updated_items = client_order_data.model_dump(exclude_unset=True).items()
    for key, value in client_order_updated_items:
        setattr(client_order, key, value)

    db.commit()
    db.refresh(client_order)

    return client_order


def delete_client_order(db: Session, client_order_id: int):
    client_order = get_client_order(db, client_order_id)
    if not client_order:
        return None

    db.delete(client_order)
    db.commit()

    return True
