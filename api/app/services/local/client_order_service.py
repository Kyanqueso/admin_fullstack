from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.schema import ClientOrder, PaymentSummary
from app.model.local.client_order import (
    ClientOrderGet,
    ClientOrderCreate,
    ClientOrderUpdate,
)
# To auto create payment summary when an order is created
from app.services.local.payment_summary_service import create_payment_summary


def get_all_client_orders(db: Session) -> list[ClientOrderGet]:
    """Retrieve all client orders from the database."""
    orders = db.query(ClientOrder).all()
    return [ClientOrderGet.model_validate(order) for order in orders]


def get_client_order_by_id(db: Session, order_id: int) -> ClientOrderGet | None:
    """Retrieve a single client order by ID."""
    order = db.query(ClientOrder).filter(ClientOrder.client_order_id == order_id).first()
    return ClientOrderGet.model_validate(order) if order else None


def get_orders_by_client(db: Session, client_id: int) -> list[ClientOrderGet]:
    """Retrieve all orders for a specific client."""
    orders = db.query(ClientOrder).filter(ClientOrder.client_id == client_id).all()
    return [ClientOrderGet.model_validate(order) for order in orders]


def create_client_order(db: Session, order: ClientOrderCreate) -> ClientOrderGet:
    """Create a new client order and automatically generate payment summary."""
    try:
        db_order = ClientOrder(
            client_id=order.client_id,
            model=order.model,
            size=order.size,
            material=order.material,
            mold=order.mold,
            color=order.color,
            heel_size=order.heel_size,
            heel_type=order.heel_type,
            has_platform=order.has_platform,
            has_slingback=order.has_slingback,
            has_buckle=order.has_buckle,
            quantity=order.quantity,
            price=order.price,
        )

        db.add(db_order)
        db.commit()
        db.refresh(db_order)

        total_amount = db_order.quantity * db_order.price

        create_payment_summary(
            db=db,
            client_order_id=db_order.client_order_id,
            total_amount=total_amount,
        )

        # 4. Return order response
        return ClientOrderGet.model_validate(db_order)

    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Failed to create client order: {str(e)}")


def update_client_order(
        db: Session,
        client_order_id: int,
        order_update: ClientOrderUpdate,
) -> ClientOrderGet | None:
    """Update an existing client order."""
    try:
        order = (
            db.query(ClientOrder)
            .filter(ClientOrder.client_order_id == client_order_id)
            .first()
        )

        if not order:
            return None

        # Only update fields that were actually provided
        update_data = order_update.model_dump(exclude_unset=True)

        if "quantity" in update_data or "price" in update_data:
            new_quantity = update_data.get('quantity', order.quantity)
            new_price = update_data.get('price', order.price)
            new_total_amount = new_price * new_quantity

            linked_payment_summary = (
                db.query(PaymentSummary)
                .filter(PaymentSummary.client_order_id == order.client_order_id)
                .first()
            )

            # assuming new_total_amount >= old total_amount
            # so paid_amount or remaining balance cannot be negative
            linked_payment_summary.total_amount = new_total_amount
            linked_payment_summary.remaining_balance = linked_payment_summary.total_amount - \
                                                       linked_payment_summary.paid_amount
            if linked_payment_summary.remaining_balance == 0:
                linked_payment_summary.balance_cleared = True
            else:
                linked_payment_summary.balance_cleared = False

            for field, value in update_data.items():
                setattr(order, field, value)

        else:
            print("error")

        db.commit()
        db.refresh(order)

        return ClientOrderGet.model_validate(order)

    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Failed to update client order: {str(e)}")


def delete_client_order(db: Session, client_order_id: int) -> bool:
    """Delete a client order by ID."""
    try:
        order = (
            db.query(ClientOrder)
            .filter(ClientOrder.client_order_id == client_order_id)
            .first()
        )

        if not order:
            return False

        db.delete(order)
        db.commit()

        return True

    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Failed to delete client order: {str(e)}")
