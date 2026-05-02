from sqlalchemy.orm import Session
from app.db.models import PaymentTransaction
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
    summary = payment_summary_service.get_payment_summary(
        db,
        payment_transaction_data.payment_summary_id
    )

    if not summary:
        raise ValueError("Payment summary not found.")

    order = db.query(ClientOrder).filter(
        ClientOrder.id == summary.client_order_id,
        ClientOrder.isDeleted == False
    ).first()

    if order is None:
        raise ValueError("Associated order not found or is archived.")

    order_total = order.price * order.quantity

    current_total_paid = db.query(func.sum(PaymentTransaction.paid_amount)).filter(
        PaymentTransaction.payment_summary_id ==
        payment_transaction_data.payment_summary_id,
        PaymentTransaction.isDeleted == False
    ).scalar() or Decimal(0)

    new_total = current_total_paid + Decimal(str(payment_transaction_data.paid_amount))

    # Overpayment check
    if new_total > order_total and abs(new_total - order_total) > Decimal("0.01"):
        raise ValueError("Payment exceeds remaining balance.")

    # Auto-increment payment_number (exclude soft-deleted cascade transactions)
    last_payment = db.query(func.max(PaymentTransaction.payment_number)).filter(
        PaymentTransaction.payment_summary_id ==
        payment_transaction_data.payment_summary_id,
        PaymentTransaction.isDeleted == False
    ).scalar()

    next_payment_number = (last_payment or 0) + 1
    payment_transaction_data.payment_number = int(next_payment_number)

    payment_transaction = PaymentTransaction(
        **payment_transaction_data.model_dump()
    )

    db.add(payment_transaction)
    db.flush()

    # Recalculate summary totals (also sets isCompleted/dateCompleted on the order)
    payment_summary_service.recalculate_payment_summary(
        db,
        payment_transaction.payment_summary_id
    )

    db.commit()
    db.refresh(payment_transaction)

    return payment_transaction


def get_payment_transaction(db: Session, payment_transaction_id: int):
    return db.query(PaymentTransaction).filter(
        PaymentTransaction.id == payment_transaction_id,
        PaymentTransaction.isDeleted == False
    ).first()


def get_payment_transactions(db: Session, skip: int = 0, limit: int | None = 10000):
    query = db.query(PaymentTransaction).filter(
        PaymentTransaction.isDeleted == False
    ).offset(skip)
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

    update_data = payment_transaction_data.model_dump(exclude_unset=True)
    amount_changed = "paid_amount" in update_data

    for key, value in update_data.items():
        setattr(payment_transaction, key, value)

    db.flush()

    if amount_changed:
        payment_summary_service.recalculate_payment_summary(
            db, payment_transaction.payment_summary_id
        )

    db.commit()
    db.refresh(payment_transaction)

    return payment_transaction


def delete_payment_transaction(db: Session, payment_transaction_id: int):
    payment_transaction = get_payment_transaction(db, payment_transaction_id)
    if not payment_transaction:
        return None

    summary_id = payment_transaction.payment_summary_id

    db.delete(payment_transaction)
    db.flush()

    # Recalculate balance now that this transaction is gone (also handles isCompleted/dateCompleted)
    payment_summary_service.recalculate_payment_summary(db, summary_id)

    db.commit()
    return True