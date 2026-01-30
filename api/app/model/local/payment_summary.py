from pydantic import BaseModel, ConfigDict


class PaymentSummaryGet(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    payment_summary_id: int
    client_order_id: int
    total_amount: float
    paid_amount: float
    remaining_balance: float
    balance_cleared: bool


# NOTE: PaymentSummaryUpdate is commented out because PaymentSummary is a
# computed/derived entity. It should not be directly edited by users.
# Instead, it is automatically recalculated when PaymentTransactions change.
# See: recalculate_payment_summary() in payment_summary_service.py
#
# class PaymentSummaryUpdate(BaseModel):
#     model_config = ConfigDict(from_attributes=True)
#
#     payment_summary_id: int
#     client_order_id: int
#     total_amount: float
#     paid_amount: float
#     remaining_balance: float
#     balance_cleared: bool
    