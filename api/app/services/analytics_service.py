from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.schemas.analytics import AnalyticsRead, MonthSales, AnnualSalesBreakdownRead
from app.db.models import PaymentSummary, PaymentTransaction, ClientOrder, Company, Client
from decimal import Decimal
from datetime import datetime, timezone
import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter


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


def _style_header_row(ws, headers: list[str], fill_color: str = "550000"):
    fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")
    font = Font(bold=True, color="FFFFFF")
    align = Alignment(horizontal="center", vertical="center")
    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.fill = fill
        cell.font = font
        cell.alignment = align
    ws.row_dimensions[1].height = 20


def _auto_fit_columns(ws):
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.value is not None:
                max_len = max(max_len, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = min(max_len + 4, 50)


def generate_full_report(db: Session) -> bytes:
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # --- Sheet 1: Companies ---
    ws_companies = wb.create_sheet("Companies")
    headers_companies = ["ID", "Name", "Address"]
    _style_header_row(ws_companies, headers_companies)
    companies = db.query(Company).filter(Company.isDeleted == False).order_by(Company.id).all()
    for c in companies:
        ws_companies.append([c.id, c.name, c.address or ""])
    _auto_fit_columns(ws_companies)

    # --- Sheet 2: Clients ---
    ws_clients = wb.create_sheet("Clients")
    headers_clients = ["ID", "Company", "First Name", "Last Name", "Address", "Viber Number", "Notes"]
    _style_header_row(ws_clients, headers_clients)
    clients = (
        db.query(Client)
        .join(Company, Client.company_id == Company.id)
        .filter(Client.isDeleted == False, Company.isDeleted == False)
        .order_by(Client.id)
        .all()
    )
    for cl in clients:
        ws_clients.append([
            cl.id,
            cl.company.name,
            cl.first_name,
            cl.last_name,
            cl.address or "",
            cl.viber_number,
            cl.notes or ""
        ])
    _auto_fit_columns(ws_clients)

    # --- Sheet 3: All Orders ---
    ws_orders = wb.create_sheet("All Orders")
    headers_orders = [
        "Order ID", "Company", "Client Name", "Order Date",
        "Model", "Size", "Material", "Color", "Mold",
        "Heel Size", "Heel Type", "Platform", "Slingback", "Buckle",
        "Quantity", "Price", "Status", "Date Completed"
    ]
    _style_header_row(ws_orders, headers_orders)
    all_orders = (
        db.query(ClientOrder)
        .join(Client, ClientOrder.client_id == Client.id)
        .join(Company, Client.company_id == Company.id)
        .filter(ClientOrder.isDeleted == False)
        .order_by(ClientOrder.order_date.desc())
        .all()
    )
    for o in all_orders:
        client_name = f"{o.client.first_name} {o.client.last_name}"
        company_name = o.client.company.name
        order_date = o.order_date.strftime("%Y-%m-%d") if o.order_date else ""
        date_completed = o.dateCompleted.strftime("%Y-%m-%d") if o.dateCompleted else ""
        status = "Completed" if o.isCompleted else "Pending"
        ws_orders.append([
            o.id, company_name, client_name, order_date,
            o.model, float(o.size), o.material, o.color, o.mold,
            o.heel_size, o.heel_type,
            "Yes" if o.has_platform else "No",
            "Yes" if o.has_slingback else "No",
            "Yes" if o.has_buckle else "No",
            o.quantity, float(o.price), status, date_completed
        ])
    _auto_fit_columns(ws_orders)

    # --- Sheet 4: Payments ---
    ws_payments = wb.create_sheet("Payments")
    headers_payments = [
        "Payment ID", "Order ID", "Company", "Client Name",
        "Payment #", "Paid Amount", "Payment Date"
    ]
    _style_header_row(ws_payments, headers_payments)
    transactions = (
        db.query(PaymentTransaction)
        .join(PaymentSummary, PaymentTransaction.payment_summary_id == PaymentSummary.id)
        .join(ClientOrder, PaymentSummary.client_order_id == ClientOrder.id)
        .join(Client, ClientOrder.client_id == Client.id)
        .join(Company, Client.company_id == Company.id)
        .filter(PaymentTransaction.isDeleted == False, ClientOrder.isDeleted == False)
        .order_by(PaymentTransaction.payment_date.desc())
        .all()
    )
    for tx in transactions:
        order = tx.payment_summary.client_order
        client = order.client
        client_name = f"{client.first_name} {client.last_name}"
        company_name = client.company.name
        pay_date = tx.payment_date.strftime("%Y-%m-%d") if tx.payment_date else ""
        ws_payments.append([
            tx.id, order.id, company_name, client_name,
            tx.payment_number, float(tx.paid_amount), pay_date
        ])
    _auto_fit_columns(ws_payments)

    # --- Sheet 5: Completed Orders ---
    ws_completed = wb.create_sheet("Completed Orders")
    headers_completed = [
        "Order ID", "Company", "Client Name", "Order Date",
        "Model", "Size", "Material", "Color", "Mold",
        "Heel Size", "Heel Type", "Platform", "Slingback", "Buckle",
        "Quantity", "Price", "Date Completed"
    ]
    _style_header_row(ws_completed, headers_completed)
    completed_orders = (
        db.query(ClientOrder)
        .join(Client, ClientOrder.client_id == Client.id)
        .join(Company, Client.company_id == Company.id)
        .filter(ClientOrder.isDeleted == False, ClientOrder.isCompleted == True)
        .order_by(ClientOrder.dateCompleted.desc())
        .all()
    )
    for o in completed_orders:
        client_name = f"{o.client.first_name} {o.client.last_name}"
        company_name = o.client.company.name
        order_date = o.order_date.strftime("%Y-%m-%d") if o.order_date else ""
        date_completed = o.dateCompleted.strftime("%Y-%m-%d") if o.dateCompleted else ""
        ws_completed.append([
            o.id, company_name, client_name, order_date,
            o.model, float(o.size), o.material, o.color, o.mold,
            o.heel_size, o.heel_type,
            "Yes" if o.has_platform else "No",
            "Yes" if o.has_slingback else "No",
            "Yes" if o.has_buckle else "No",
            o.quantity, float(o.price), date_completed
        ])
    _auto_fit_columns(ws_completed)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.read()