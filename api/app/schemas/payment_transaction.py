from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator
from decimal import Decimal
from datetime import date


class PaymentTransactionCreate(BaseModel):
    payment_summary_id: int
    payment_number: Optional[int] = None
    paid_amount: Decimal
    payment_date: date

    @field_validator("payment_summary_id")
    @classmethod
    def validate_payment_summary_id(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("payment_summary_id must be a positive integer.")
        return v

    @field_validator("paid_amount")
    @classmethod
    def validate_paid_amount(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0"):
            raise ValueError("paid_amount must be greater than 0.")
        if v > Decimal("9999999.99"):
            raise ValueError("paid_amount is too large.")
        if v.as_tuple().exponent < -2:
            raise ValueError("paid_amount cannot have more than 2 decimal places.")
        return v

    @field_validator("payment_date")
    @classmethod
    def validate_payment_date(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("payment_date cannot be in the future.")
        if v.year < 2000:
            raise ValueError("payment_date year must be 2000 or later.")
        return v


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
