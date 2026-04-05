from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.schemas.analytics import AnalyticsRead, MonthSales, AnnualSalesBreakdownRead
from app.db.models import PaymentSummary, PaymentTransaction, ClientOrder
from decimal import Decimal
from datetime import datetime, timezone


def get_analytics(db: Session):
    current_date = datetime.now(timezone.utc)
    current_month = current_date.month
    current_year = current_date.year

    total_balance = db.query(func.sum(PaymentSummary.remaining_balance)).join(
        ClientOrder, PaymentSummary.client_order_id == ClientOrder.id
    ).filter(
        PaymentSummary.isDeleted == False,
        ClientOrder.isDeleted == False
    ).scalar() or Decimal(0)

    total_completed_order = db.query(func.count(ClientOrder.id)).filter(
        ClientOrder.isCompleted == True,
        ClientOrder.isDeleted == False
    ).scalar() or 0

    total_pending_order = db.query(func.count(ClientOrder.id)).filter(
        ClientOrder.isCompleted == False,
        ClientOrder.isDeleted == False
    ).scalar() or 0

    monthly_sales = db.query(func.sum(PaymentTransaction.paid_amount)).filter(
        extract("month", PaymentTransaction.payment_date) == current_month,
        extract("year", PaymentTransaction.payment_date) == current_year,
        PaymentTransaction.isDeleted == False
    ).scalar() or Decimal(0)

    annual_sales = db.query(func.sum(PaymentTransaction.paid_amount)).filter(
        extract("year", PaymentTransaction.payment_date) == current_year,
        PaymentTransaction.isDeleted == False
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
        month_sales = db.query(func.sum(PaymentTransaction.paid_amount)).filter(
            extract("month", PaymentTransaction.payment_date) == month_number,
            extract("year", PaymentTransaction.payment_date) == year_number,
            PaymentTransaction.isDeleted == False
        ).scalar() or Decimal(0)

        monthly_data.append(MonthSales(
            month_number=month_number,
            month_name=month_names[month_number - 1],
            sales=month_sales
        ))

    return AnnualSalesBreakdownRead(year_number=year_number, monthly_data=monthly_data)


def get_uncollected_balance(db: Session):
    from app.schemas.analytics import UncollectedBalanceItem

    summaries = (
        db.query(PaymentSummary)
        .join(ClientOrder, PaymentSummary.client_order_id == ClientOrder.id)
        .filter(
            PaymentSummary.remaining_balance > 0,
            ClientOrder.isDeleted == False
        )
        .all()
    )

    items = []
    for ps in summaries:
        order = ps.client_order
        client = order.client
        company = client.company

        pays = {}
        for tx in ps.payment_transactions:
            if not tx.isDeleted:
                pays[tx.payment_number] = tx.paid_amount

        items.append(UncollectedBalanceItem(
            company=company.name,
            name=f"{client.first_name} {client.last_name}",
            contact_number=client.viber_number,
            order_date=order.order_date,
            price=order.price,
            first_pay=pays.get(1, Decimal(0)),
            second_pay=pays.get(2, Decimal(0)),
            third_pay=pays.get(3, Decimal(0)),
            balance=ps.remaining_balance
        ))

    return items