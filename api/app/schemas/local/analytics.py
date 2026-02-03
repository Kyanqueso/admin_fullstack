from pydantic import BaseModel
from decimal import Decimal
from typing import List


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