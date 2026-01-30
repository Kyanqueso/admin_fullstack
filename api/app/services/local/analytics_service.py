from sqlalchemy import func
from datetime import date
from sqlalchemy.orm import Session
from app.db.schema import PaymentSummary, PaymentTransaction
from app.model.local.analytics import AnalyticsGet


def get_analytics(db: Session) -> AnalyticsGet:
    today = date.today()

    total_balance = (
        db.query(func.coalesce(func.sum(PaymentSummary.remaining_balance), 0))
        .scalar()
    )

    total_completed_order = (
        db.query(func.count(PaymentSummary.payment_summary_id))
        .filter(PaymentSummary.remaining_balance == 0)
        .scalar()
    )

    total_pending_order = (
        db.query(func.count(PaymentSummary.payment_summary_id))
        .filter(PaymentSummary.remaining_balance > 0)
        .scalar()
    )

    monthly_sales = (
        db.query(func.coalesce(func.sum(PaymentTransaction.paid_amount), 0))
        .filter(func.extract("year", PaymentTransaction.payment_date) == today.year)
        .filter(func.extract("month", PaymentTransaction.payment_date) == today.month)
        .scalar()
    )

    annual_sales = (
        db.query(func.coalesce(func.sum(PaymentTransaction.paid_amount), 0))
        .filter(func.extract("year", PaymentTransaction.payment_date) == today.year)
        .scalar()
    )

    return AnalyticsGet(
        total_balance=total_balance,
        total_completed_order=total_completed_order,
        total_pending_order=total_pending_order,
        monthly_sales=monthly_sales,
        annual_sales=annual_sales,
    )
