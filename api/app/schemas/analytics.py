from pydantic import BaseModel
from decimal import Decimal
from typing import List
from datetime import datetime

class AnalyticsRead(BaseModel):
    total_balance: Decimal
    total_completed_order: int
    total_pending_order: int
    monthly_sales: Decimal
    annual_sales: Decimal


class MonthSales(BaseModel):
    month_number: int
    month_name: str
    sales: Decimal


class AnnualSalesBreakdownRead(BaseModel):
    year_number: int
    monthly_data: List[MonthSales]
    

class UncollectedBalanceItem(BaseModel):
    company: str
    name: str
    contact_number: str
    order_date: datetime
    quantity: int
    price: Decimal
    first_pay: Decimal
    second_pay: Decimal
    third_pay: Decimal
    balance: Decimal