from sqlalchemy.orm import Session
from app.db.models import PaymentTransaction
from app.schemas.payment_transaction import (
    PaymentTransactionCreate,
    PaymentTransactionUpdate
)
from app.services import payment_summary_service


from decimal import Decimal
from sqlalchemy import func


def create_payment_transaction(
        db: Session,
        payment_transaction_data: PaymentTransactionCreate
):
    """
    Creates a payment transaction.
    Prevents duplicate payment_number per summary.
    Prevents overpayment.
    """

    # Get payment summary
    summary = payment_summary_service.get_payment_summary(
        db,
        payment_transaction_data.payment_summary_id
    )

    if not summary:
        raise ValueError("Payment summary not found.")

    order = summary.client_order
    order_total = Decimal(order.price) * Decimal(order.quantity)

    # Current total paid
    current_total_paid = db.query(func.sum(PaymentTransaction.paid_amount)).filter(
        PaymentTransaction.payment_summary_id ==
        payment_transaction_data.payment_summary_id
    ).scalar() or Decimal(0)

    # 🚨 Prevent overpayment
    if current_total_paid + Decimal(payment_transaction_data.paid_amount) > order_total:
        raise ValueError("Payment exceeds remaining balance.")

    # Check for duplicate payment_number within same summary
    existing = db.query(PaymentTransaction).filter(
        PaymentTransaction.payment_summary_id ==
        payment_transaction_data.payment_summary_id,
        PaymentTransaction.payment_number ==
        payment_transaction_data.payment_number
    ).first()

    if existing:
        return update_payment_transaction(
            db,
            existing.id,
            PaymentTransactionUpdate(
                paid_amount=payment_transaction_data.paid_amount,
                payment_date=payment_transaction_data.payment_date
            )
        )

    payment_transaction = PaymentTransaction(
        **payment_transaction_data.model_dump()
    )

    db.add(payment_transaction)
    db.flush()

    # Auto-recalculate summary totals
    payment_summary_service.recalculate_payment_summary(
        db,
        payment_transaction.payment_summary_id
    )

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
    payment_transaction = get_payment_transaction(
        db,
        payment_transaction_id
    )

    if not payment_transaction:
        return None

    updated_items = payment_transaction_data.model_dump(
        exclude_unset=True
    ).items()

    for key, value in updated_items:
        setattr(payment_transaction, key, value)

    db.flush()

    # Auto-recalculate summary totals
    payment_summary_service.recalculate_payment_summary(
        db,
        payment_transaction.payment_summary_id
    )

    db.commit()
    db.refresh(payment_transaction)

    return payment_transaction


def delete_payment_transaction(
        db: Session,
        payment_transaction_id: int
):
    payment_transaction = get_payment_transaction(
        db,
        payment_transaction_id
    )

    if not payment_transaction:
        return None

    summary_id = payment_transaction.payment_summary_id

    db.delete(payment_transaction)
    db.flush()

    # Auto-recalculate after delete
    payment_summary_service.recalculate_payment_summary(
        db,
        summary_id
    )

    db.commit()

    return True
