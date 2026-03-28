from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import PaymentSummary, PaymentTransaction, ClientOrder
from app.schemas.payment_summary import PaymentSummaryCreate, PaymentSummaryUpdate
from decimal import Decimal
from datetime import datetime, timezone


def create_payment_summary(db: Session, payment_summary_data: PaymentSummaryCreate):
    payment_summary = PaymentSummary(**payment_summary_data.model_dump())
    db.add(payment_summary)
    db.commit()
    db.refresh(payment_summary)
    return payment_summary


def get_payment_summary(db: Session, payment_summary_id: int):
    return db.query(PaymentSummary).filter(
        PaymentSummary.id == payment_summary_id,
        PaymentSummary.isDeleted == False
    ).first()


def get_payment_summaries(db: Session, skip: int = 0, limit: int | None = 10000, archived: bool = False):
    query = db.query(PaymentSummary).filter(PaymentSummary.isDeleted == archived).offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def update_payment_summary(db: Session, payment_summary_id: int, payment_summary_data: PaymentSummaryUpdate):
    payment_summary = get_payment_summary(db, payment_summary_id)
    if not payment_summary:
        return None

    for key, value in payment_summary_data.model_dump(exclude_unset=True).items():
        setattr(payment_summary, key, value)

    db.commit()
    db.refresh(payment_summary)
    return payment_summary


def delete_payment_summary(db: Session, payment_summary_id: int):
    payment_summary = get_payment_summary(db, payment_summary_id)
    if not payment_summary:
        return None

    # Hard delete all transactions first, then the summary
    for tx in payment_summary.payment_transactions:
        db.delete(tx)
    db.flush()

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
    return db.query(PaymentSummary).filter(
        PaymentSummary.client_order_id == client_order_id,
        PaymentSummary.isDeleted == False
    ).first()


def recalculate_payment_summary(db: Session, payment_summary_id: int):
    payment_summary = get_payment_summary(db, payment_summary_id)
    if not payment_summary:
        return None

    total_paid = db.query(func.sum(PaymentTransaction.paid_amount)).filter(
        PaymentTransaction.payment_summary_id == payment_summary_id,
        PaymentTransaction.isDeleted == False
    ).scalar() or Decimal(0)

    order = db.query(ClientOrder).filter(
        ClientOrder.id == payment_summary.client_order_id,
        ClientOrder.isDeleted == False
    ).first()

    if not order:
        return payment_summary

    order_total = order.price * order.quantity

    if abs(total_paid - order_total) < Decimal("0.01") or total_paid > order_total:
        payment_summary.paid_amount = order_total
        payment_summary.remaining_balance = Decimal(0)
        order.is_zero_balance = True
        if not order.isCompleted:
            order.isCompleted = True
            order.dateCompleted = datetime.now(timezone.utc)
    else:
        payment_summary.paid_amount = total_paid
        payment_summary.remaining_balance = order_total - total_paid
        order.is_zero_balance = False
        if order.isCompleted:
            order.isCompleted = False
            order.dateCompleted = None

    db.flush()
    return payment_summary