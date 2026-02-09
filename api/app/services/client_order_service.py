from sqlalchemy.orm import Session
from app.db.models import ClientOrder
from app.schemas.client_order import ClientOrderCreate, ClientOrderUpdate
from app.services import payment_summary_service


def create_client_order(db: Session, client_order_data: ClientOrderCreate):
    client_order = ClientOrder(**client_order_data.model_dump())

    db.add(client_order)
    db.flush()

    payment_summary_service.create_payment_summary_for_order(
        db=db,
        client_order_id=client_order.id,
        order_price=client_order.price * client_order.quantity
    )

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

    # Check if price or quantity is being updated
    update_data = client_order_data.model_dump(exclude_unset=True)
    price_or_quantity_changed = "price" in update_data or "quantity" in update_data

    for key, value in update_data.items():
        setattr(client_order, key, value)

    db.flush()

    # Recalculate PaymentSummary if price or quantity changed
    if price_or_quantity_changed and client_order.payment_summary:
        payment_summary_service.recalculate_payment_summary(db, client_order.payment_summary.id)

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
