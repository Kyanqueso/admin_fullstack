from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import ClientOrder, PaymentTransaction, Client
from app.schemas.client_order import ClientOrderCreate, ClientOrderUpdate
from app.services import payment_summary_service
from decimal import Decimal


def create_client_order(db: Session, client_order_data: ClientOrderCreate):
    client = db.query(Client).filter(
        Client.id == client_order_data.client_id,
        Client.isDeleted == False
    ).first()
    if not client:
        raise ValueError("Client not found or is archived.")

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
    client_order = db.query(ClientOrder).filter(
        ClientOrder.id == client_order_id,
        ClientOrder.isDeleted == False
    ).first()
    if not client_order:
        raise ValueError(f"Client order with ID {client_order_id} not found.")
    return client_order


def get_client_orders(
        db: Session,
        skip: int = 0,
        limit: int | None = 10000,
        completed: bool | None = None,
        archived: bool = False
):
    query = db.query(ClientOrder).filter(ClientOrder.isDeleted == archived)

    if completed is not None:
        query = query.filter(ClientOrder.isCompleted == completed)

    query = query.offset(skip)

    if limit is not None:
        query = query.limit(limit)

    return query.all()


def update_client_order(db: Session, client_order_id: int, client_order_data: ClientOrderUpdate):
    client_order = db.query(ClientOrder).filter(
        ClientOrder.id == client_order_id,
        ClientOrder.isDeleted == False
    ).first()
    if not client_order:
        raise ValueError(f"Client order with ID {client_order_id} not found.")

    update_data = client_order_data.model_dump(exclude_unset=True)

    if not update_data:
        raise ValueError("No fields provided for update.")

    price_or_quantity_changed = "price" in update_data or "quantity" in update_data

    # Block spec changes on completed orders, but allow price/quantity edits
    # (which will trigger recalculation and uncomplete the order if needed).
    if client_order.isCompleted and not price_or_quantity_changed:
        raise ValueError("Cannot edit a completed order. Remove a payment transaction first.")

    # Check if the order total would be reduced below the amount already paid 
    # if price or quantity is being updated. Allow small rounding differences up to 1 cent.
    if price_or_quantity_changed and client_order.payment_summary:
        new_price = Decimal(str(update_data.get("price", client_order.price)))
        new_quantity = update_data.get("quantity", client_order.quantity)
        new_order_total = new_price * new_quantity

        total_paid = db.query(func.sum(PaymentTransaction.paid_amount)).filter(
            PaymentTransaction.payment_summary_id == client_order.payment_summary.id,
            PaymentTransaction.isDeleted == False
        ).scalar() or Decimal(0)

        if new_order_total < total_paid and abs(new_order_total - total_paid) > Decimal("0.01"):
            raise ValueError("New order total cannot be less than the amount already paid.")

    for key, value in update_data.items():
        setattr(client_order, key, value)

    db.flush()

    if price_or_quantity_changed and client_order.payment_summary:
        payment_summary_service.recalculate_payment_summary(db, client_order.payment_summary.id)

    db.commit()
    db.refresh(client_order)

    return client_order


def restore_client_order(db: Session, client_order_id: int):
    client_order = db.query(ClientOrder).filter(
        ClientOrder.id == client_order_id,
        ClientOrder.isDeleted == True
    ).first()

    if not client_order:
        raise ValueError(f"Archived order with ID {client_order_id} not found.")

    if client_order.client.isDeleted:
        raise ValueError("Cannot restore this order — its client is still archived. Restore the client first.")

    if client_order.payment_summary:
        for tx in client_order.payment_summary.payment_transactions:
            tx.isDeleted = False
        client_order.payment_summary.isDeleted = False

    client_order.isDeleted = False
    db.commit()

    return client_order

# Soft delete: order, its summary, and transactions are archived together.
def delete_client_order(db: Session, client_order_id: int):
    client_order = db.query(ClientOrder).filter(
        ClientOrder.id == client_order_id,
        ClientOrder.isDeleted == False
    ).first()
    if not client_order:
        raise ValueError(f"Client order with ID {client_order_id} not found.")

    if client_order.payment_summary:
        for tx in client_order.payment_summary.payment_transactions:
            tx.isDeleted = True
        client_order.payment_summary.isDeleted = True

    client_order.isDeleted = True
    db.commit()

    return True

# Permanent delete: order, its payment summary, and all transactions are removed from the database.
def hard_delete_client_order(db: Session, client_order_id: int):
    client_order = db.query(ClientOrder).filter(
        ClientOrder.id == client_order_id
    ).first()
    if not client_order:
        raise ValueError(f"Client order with ID {client_order_id} not found.")

    # If this order has a payment summary, delete all associated transactions first before deleting the summary itself, due to foreign key constraints.
    if client_order.payment_summary:
        for tx in client_order.payment_summary.payment_transactions:
            db.delete(tx)
        db.flush()
        db.delete(client_order.payment_summary)
        db.flush()

    # Then finally delete the order itself
    db.delete(client_order)
    db.commit()

    return True