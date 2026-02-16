from sqlalchemy.orm import Session
from app.db.models import PaymentTransaction
from app.schemas.payment_transaction import (
    PaymentTransactionCreate,
    PaymentTransactionUpdate
)
from app.services import payment_summary_service


def create_payment_transaction(
        db: Session,
        payment_transaction_data: PaymentTransactionCreate
):
    """
    Creates a payment transaction.
    Prevents duplicate payment_number per summary.
    """

    # Check for duplicate payment_number within same summary
    existing = db.query(PaymentTransaction).filter(
        PaymentTransaction.payment_summary_id ==
        payment_transaction_data.payment_summary_id,
        PaymentTransaction.payment_number ==
        payment_transaction_data.payment_number
    ).first()

    if existing:
        # Update existing instead of creating duplicate
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

    # Auto-recalculate summary totals (includes overpayment + completion logic)
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
