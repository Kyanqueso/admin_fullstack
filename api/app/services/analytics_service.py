from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.schemas.analytics import AnalyticsRead, MonthSales, AnnualSalesBreakdownRead
from app.db.models import ClientOrder, PaymentSummary
from decimal import Decimal
from datetime import datetime, timezone

def get_analytics(db: Session):
    current_date = datetime.now(timezone.utc)
    current_month = current_date.month
    current_year = current_date.year

    total_balance = db.query(func.sum(PaymentSummary.remaining_balance)).scalar() or Decimal(0)

    total_completed_order = db.query(func.count(PaymentSummary.id)).filter(
        PaymentSummary.remaining_balance == 0).scalar() or 0

    total_pending_order = db.query(func.count(PaymentSummary.id)).filter(
        PaymentSummary.remaining_balance > 0).scalar() or 0

    monthly_sales = db.query(func.sum(ClientOrder.price)).filter(
        extract("month", ClientOrder.order_date) == current_month,
        extract("year", ClientOrder.order_date) == current_year
    ).scalar() or Decimal(0)

    annual_sales = db.query(func.sum(ClientOrder.price)).filter(
        extract("year", ClientOrder.order_date) == current_year
    ).scalar() or Decimal(0)

    return AnalyticsRead(
        total_balance=total_balance,
        total_completed_order=total_completed_order,
        total_pending_order=total_pending_order,
        monthly_sales=monthly_sales,
        annual_sales=annual_sales
    )

def get_annual_sales_breakdown(db: Session, year_number: int = None):
    if year_number is None:
        year_number = datetime.now(timezone.utc).year

    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    monthly_data = []

    for month_number in range(1, 13):
        month_sales = db.query(func.sum(ClientOrder.price)).filter(
            extract("month", ClientOrder.order_date) == month_number,
            extract("year", ClientOrder.order_date) == year_number,
        ).scalar() or Decimal(0)

        monthly_data.append(MonthSales(
            month_number=month_number,
            month_name=month_names[month_number - 1],
            sales=month_sales
        ))

    return AnnualSalesBreakdownRead(year_number=year_number, monthly_data=monthly_data)