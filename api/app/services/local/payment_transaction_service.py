from sqlalchemy.orm import Session
from app.db.models import PaymentTransaction
from app.schemas.local.payment_transaction import PaymentTransactionCreate, PaymentTransactionUpdate


def create_payment_transaction(db: Session, payment_transaction_data: PaymentTransactionCreate):
    payment_transaction = PaymentTransaction(**payment_transaction_data.model_dump())

    db.add(payment_transaction)
    db.commit()
    db.refresh(payment_transaction)

    return payment_transaction


def get_payment_transaction(db: Session, payment_transaction_id: int):
    return db.query(PaymentTransaction).filter(PaymentTransaction.id == payment_transaction_id).first()


def get_payment_transactions(db: Session, skip: int = 0, limit: int | None = 10000):
    query = db.query(PaymentTransaction).offset(skip)
    if limit is not None:
        query = query.limit(limit)

    return query.all()


def update_payment_transaction(db: Session, payment_transaction_id: int,
                               payment_transaction_data: PaymentTransactionUpdate):
    payment_transaction = get_payment_transaction(db, payment_transaction_id)
    if not payment_transaction:
        return None

    payment_transaction_updated_items = payment_transaction_data.model_dump(exclude_unset=True).items()
    for key, value in payment_transaction_updated_items:
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
