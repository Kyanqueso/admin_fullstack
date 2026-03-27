from typing import Optional
from pydantic import BaseModel, ConfigDict
from decimal import Decimal
from datetime import date


class PaymentTransactionCreate(BaseModel):
    payment_summary_id: int
    payment_number: Optional[int] = None
    paid_amount: Decimal
    payment_date: date


class PaymentTransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    payment_summary_id: int
    payment_number: int
    paid_amount: Decimal
    payment_date: date


class PaymentTransactionUpdate(BaseModel):
    payment_summary_id: int | None = None
    payment_number: int | None = None
    paid_amount: Decimal | None = None
    payment_date: date | None = None
