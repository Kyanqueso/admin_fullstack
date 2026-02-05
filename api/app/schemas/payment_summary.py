from pydantic import BaseModel, ConfigDict
from decimal import Decimal


class PaymentSummaryCreate(BaseModel):
    client_order_id: int
    paid_amount: Decimal | None = None
    remaining_balance: Decimal


class PaymentSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_order_id: int
    paid_amount: Decimal
    remaining_balance: Decimal


class PaymentSummaryUpdate(BaseModel):
    client_order_id: int | None = None
    paid_amount: Decimal | None = None
    remaining_balance: Decimal | None = None
