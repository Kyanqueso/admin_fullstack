from pydantic import BaseModel

class AnalyticsGet(BaseModel):
    total_balance: float
    total_completed_order: int
    total_pending_order: int
    monthly_sales: float
    annual_sales: float
