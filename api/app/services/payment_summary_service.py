from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import PaymentSummary, PaymentTransaction
from app.schemas.payment_summary import PaymentSummaryCreate, PaymentSummaryUpdate
from decimal import Decimal


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


def create_payment_summary_for_order(db: Session, client_order_id: int, order_price: Decimal):
    payment_summary = PaymentSummary(
        client_order_id=client_order_id,
        paid_amount=Decimal(0),
        remaining_balance=order_price
    )
    db.add(payment_summary)
    return payment_summary


def get_payment_summary_by_order(db: Session, client_order_id: int):
    return db.query(PaymentSummary).filter(PaymentSummary.client_order_id == client_order_id).first()


def recalculate_payment_summary(db: Session, payment_summary_id: int):
    payment_summary = get_payment_summary(db, payment_summary_id)
    if not payment_summary:
        return None

    total_paid = db.query(func.sum(PaymentTransaction.paid_amount)).filter(
        PaymentTransaction.payment_summary_id == payment_summary_id
    ).scalar() or Decimal(0)

    order = payment_summary.client_order
    # Expire the order to clear any stale session-level state before reading/writing
    db.expire(order)
    order_total = Decimal(order.price) * Decimal(order.quantity)

    # Prevent overpayment effect
    if total_paid >= order_total:
        payment_summary.paid_amount = order_total
        payment_summary.remaining_balance = Decimal(0)
        order.is_zero_balance = True
    else:
        payment_summary.paid_amount = total_paid
        payment_summary.remaining_balance = order_total - total_paid
        order.is_zero_balance = False

    db.flush()
    return payment_summary
