from sqlalchemy.orm import Session
from app.db.models import PaymentTransaction, CompletedOrder
from app.schemas.payment_transaction import (
    PaymentTransactionCreate,
    PaymentTransactionUpdate
)
from app.services import payment_summary_service

from decimal import Decimal
from sqlalchemy import func
from app.db.models import ClientOrder


def create_payment_transaction(
        db: Session,
        payment_transaction_data: PaymentTransactionCreate
):
    # Get payment summary
    summary = payment_summary_service.get_payment_summary(
        db,
        payment_transaction_data.payment_summary_id
    )

    if not summary:
        raise ValueError("Payment summary not found.")

    order = db.query(ClientOrder).filter(
        ClientOrder.id == summary.client_order_id
    ).first()

    if order is None:
        raise ValueError("Associated order not found. It may have already been completed.")

    order_total = order.price * order.quantity

    current_total_paid = db.query(func.sum(PaymentTransaction.paid_amount)).filter(
        PaymentTransaction.payment_summary_id ==
        payment_transaction_data.payment_summary_id
    ).scalar() or Decimal(0)

    new_total = current_total_paid + Decimal(str(payment_transaction_data.paid_amount))

    # Overpayment check
    if new_total > order_total and abs(new_total - order_total) > Decimal("0.01"):
        raise ValueError("Payment exceeds remaining balance.")

    # Auto-increment payment_number
    last_payment = db.query(func.max(PaymentTransaction.payment_number)).filter(
        PaymentTransaction.payment_summary_id ==
        payment_transaction_data.payment_summary_id
    ).scalar()

    next_payment_number = (last_payment or 0) + 1
    payment_transaction_data.payment_number = int(next_payment_number)

    print("DEBUG DATA:", payment_transaction_data.model_dump())

    payment_transaction = PaymentTransaction(
        **payment_transaction_data.model_dump()
    )

    db.add(payment_transaction)
    db.flush()

    # Stamp original_order_id on the summary NOW, before the order is deleted.
    # After db.delete(order), payment_summaries.client_order_id becomes NULL
    # (SET NULL), so we need this permanent reference for history lookup.
    if summary.original_order_id is None:
        summary.original_order_id = order.id
        db.flush()

    # Recalculate summary totals (also sets order.is_zero_balance)
    payment_summary_service.recalculate_payment_summary(
        db,
        payment_transaction.payment_summary_id
    )

    # Re-fetch order after recalculation
    order = db.query(ClientOrder).filter(
        ClientOrder.id == summary.client_order_id
    ).first()

    if not order:
        raise ValueError("Order missing after recalculation.")

    print("DEBUG:", "total_paid=", new_total, "order_total=", order_total)

    if order.is_zero_balance:
        original_id = order.id

        already_completed = db.query(CompletedOrder).filter(
            CompletedOrder.original_order_id == original_id
        ).first()

        if not already_completed:
            completed = CompletedOrder(
                client_id=order.client_id,
                order_date=order.order_date,
                model=order.model,
                size=order.size,
                material=order.material,
                color=order.color,
                mold=order.mold,
                heel_size=order.heel_size,
                heel_type=order.heel_type,
                has_platform=order.has_platform,
                has_slingback=order.has_slingback,
                has_buckle=order.has_buckle,
                quantity=order.quantity,
                price=order.price,
                original_order_id=original_id
            )
            db.add(completed)
            db.flush()

        # Delete the ClientOrder.
        # Because FK is ondelete="SET NULL" and cascade is NOT "delete",
        # the PaymentSummary row survives with client_order_id = NULL
        # but original_order_id intact — enabling history lookup.
        db.delete(order)
        db.flush()

    db.commit()
    db.refresh(payment_transaction)

    return payment_transaction


def get_payment_transaction(db: Session, payment_transaction_id: int):
    return db.query(PaymentTransaction).filter(
        PaymentTransaction.id == payment_transaction_id
    ).first()


def get_payment_transactions(db: Session, skip: int = 0, limit: int | None = 10000):
    query = db.query(PaymentTransaction).offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def update_payment_transaction(
        db: Session,
        payment_transaction_id: int,
        payment_transaction_data: PaymentTransactionUpdate
):
    payment_transaction = get_payment_transaction(db, payment_transaction_id)
    if not payment_transaction:
        return None

    updated_items = payment_transaction_data.model_dump(exclude_unset=True).items()
    for key, value in updated_items:
        setattr(payment_transaction, key, value)

    db.commit()
    db.refresh(payment_transaction)

    return payment_transaction


def delete_payment_transaction(db: Session, payment_transaction_id: int):
    payment_transaction = get_payment_transaction(db, payment_transaction_id)
    if not payment_transaction:
        return None

    db.delete(payment_transaction)
    db.commit()

    return True