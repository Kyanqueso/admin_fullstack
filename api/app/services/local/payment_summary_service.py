from sqlalchemy.orm import Session
from app.db.models import PaymentSummary
from app.schemas.local.payment_summary import PaymentSummaryCreate, PaymentSummaryUpdate


def create_payment_summary(db: Session, payment_summary_data: PaymentSummaryCreate):
    payment_summary = PaymentSummary(**payment_summary_data.model_dump())

    db.add(payment_summary)
    db.commit()
    db.refresh(payment_summary)

    return payment_summary


def get_payment_summary(db: Session, payment_summary_id: int):
    return db.query(PaymentSummary).filter(PaymentSummary.id == payment_summary_id).first()


def get_payment_summaries(db: Session, skip: int = 0, limit: int | None = 10000):
    query = db.query(PaymentSummary).offset(skip)
    if limit is not None:
        query = query.limit(limit)

    return query.all()


def update_payment_summary(db: Session, payment_summary_id: int, payment_summary_data: PaymentSummaryUpdate):
    payment_summary = get_payment_summary(db, payment_summary_id)
    if not payment_summary:
        return None

    payment_summary_updated_items = payment_summary_data.model_dump(exclude_unset=True).items()
    for key, value in payment_summary_updated_items:
        setattr(payment_summary, key, value)

    db.commit()
    db.refresh(payment_summary)

    return payment_summary


def delete_payment_summary(db: Session, payment_summary_id: int):
    payment_summary = get_payment_summary(db, payment_summary_id)
    if not payment_summary:
        return None

    db.delete(payment_summary)
    db.commit()

    return True
