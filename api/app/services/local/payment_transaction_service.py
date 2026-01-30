from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException, status

from app.db.schema import PaymentTransaction, PaymentSummary 
from app.model.local.payment_transaction import (
    PaymentTransactionGet,
    PaymentTransactionCreate,
    PaymentTransactionUpdate,
)

from app.services.local.payment_summary_service import (
    recalculate_payment_summary,
)

def get_payment_transaction_by_id(
    db: Session,
    payment_transaction_id: int,
) -> PaymentTransactionGet | None:
    transaction = (
        db.query(PaymentTransaction)
        .filter(
            PaymentTransaction.payment_transaction_id
            == payment_transaction_id
        )
        .first()
    )
    return PaymentTransactionGet.model_validate(transaction) if transaction else None


def get_payment_transactions_by_summary(
    db: Session,
    payment_summary_id: int,
) -> list[PaymentTransactionGet]:
    transactions = (
        db.query(PaymentTransaction)
        .filter(
            PaymentTransaction.payment_summary_id
            == payment_summary_id
        )
        .order_by(PaymentTransaction.payment_number.asc())
        .all()
    )
    return [PaymentTransactionGet.model_validate(t) for t in transactions]


def get_next_payment_number(
    db: Session,
    payment_summary_id: int,
) -> int:
    last_payment = (
        db.query(PaymentTransaction)
        .filter(
            PaymentTransaction.payment_summary_id == payment_summary_id
        )
        .order_by(PaymentTransaction.payment_number.desc())
        .first()
    )

    return 1 if not last_payment else last_payment.payment_number + 1


def create_payment_transaction(
    db: Session,
    data: PaymentTransactionCreate,
) -> PaymentTransactionGet:
    try:
        summary = (
            db.query(PaymentSummary)
            .filter(PaymentSummary.payment_summary_id == data.payment_summary_id)
            .first()
        )

        if not summary:
            raise HTTPException(404, "Payment summary not found")

        if data.paid_amount <= 0:
            raise HTTPException(400, "Paid amount must be greater than zero")

        if summary.paid_amount + data.paid_amount > summary.total_amount:
            raise HTTPException(400, "Payment exceeds remaining balance")

        payment_number = get_next_payment_number(
            db,
            data.payment_summary_id,
        )

        transaction = PaymentTransaction(
            payment_summary_id=data.payment_summary_id,
            payment_number=payment_number,
            paid_amount=data.paid_amount,
        )

        db.add(transaction)

        # 🔥 make transaction visible to queries
        db.flush()

        # 🔁 recalc summary
        recalculate_payment_summary(db, data.payment_summary_id)

        db.commit()
        db.refresh(transaction)

        return PaymentTransactionGet.model_validate(transaction)

    except Exception:
        db.rollback()
        raise


def update_payment_transaction(
    db: Session,
    payment_transaction_id: int,
    update: PaymentTransactionUpdate,
) -> PaymentTransactionGet | None:
    transaction = (
        db.query(PaymentTransaction)
        .filter(
            PaymentTransaction.payment_transaction_id
            == payment_transaction_id
        )
        .first()
    )

    if not transaction:
        return None

    summary = (
        db.query(PaymentSummary)
        .filter(
            PaymentSummary.payment_summary_id
            == transaction.payment_summary_id
        )
        .first()
    )

    # Validate BEFORE updating - use current transaction value
    new_total_paid = (
        summary.paid_amount
        - transaction.paid_amount
        + update.paid_amount
    )

    if new_total_paid > summary.total_amount:
        raise HTTPException(
            status_code=400,
            detail="Updated payment exceeds total amount",
        )

    # Update fields AFTER validation passes
    transaction.paid_amount = update.paid_amount
    transaction.payment_date = update.payment_date

    db.flush()

    recalculate_payment_summary(
        db,
        transaction.payment_summary_id,
    )

    db.commit()
    db.refresh(transaction)

    return PaymentTransactionGet.model_validate(transaction)



def delete_payment_transaction(
    db: Session,
    payment_transaction_id: int,
) -> bool:

    transaction = (
        db.query(PaymentTransaction)
        .filter(
            PaymentTransaction.payment_transaction_id
            == payment_transaction_id
        )
        .first()
    )

    if not transaction:
        return False

    payment_summary_id = transaction.payment_summary_id

    db.delete(transaction)

    recalculate_payment_summary(
        db,
        payment_summary_id,
    )

    db.commit()

    return True