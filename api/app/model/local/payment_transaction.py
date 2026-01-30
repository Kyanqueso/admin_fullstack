from pydantic import BaseModel, ConfigDict
from datetime import datetime


class PaymentTransactionGet(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    payment_transaction_id: int
    payment_summary_id: int
    payment_number: int
    paid_amount: float
    payment_date: datetime


class PaymentTransactionCreate(BaseModel):
    payment_summary_id: int
    paid_amount: float


class PaymentTransactionUpdate(BaseModel):
    paid_amount: float
    payment_date: datetime
    payment_summary_id: int


