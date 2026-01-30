from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.schema import Client, ClientOrder, PaymentSummary, PaymentTransaction
from app.model.local.payment_summary import PaymentSummaryGet

def get_payment_summary_by_order_id(
    db: Session,
    client_order_id: int,
) -> PaymentSummaryGet | None:

    summary = (
        db.query(PaymentSummary)
        .filter(PaymentSummary.client_order_id == client_order_id)
        .first()
    )

    if not summary:
        return None

    return PaymentSummaryGet(
        payment_summary_id=summary.payment_summary_id,
        client_order_id=summary.client_order_id,
        total_amount=summary.total_amount,
        paid_amount=summary.paid_amount,
        remaining_balance=summary.remaining_balance,
        balance_cleared=summary.balance_cleared,
    )

def get_payment_summaries_by_company_id(
        db: Session,
        company_id: int,
) -> list[PaymentSummaryGet]:
    """
    Get all payment summaries for a company by joining:
    Company -> Client -> ClientOrder -> PaymentSummary
    """
    summaries = (
        db.query(PaymentSummary)
        .join(ClientOrder, PaymentSummary.client_order_id == ClientOrder.client_order_id)
        .join(Client, ClientOrder.client_id == Client.id)
        .filter(Client.company_id == company_id)
        .all()
    )

    return [PaymentSummaryGet.model_validate(summary) for summary in summaries]

def create_payment_summary(
    db: Session,
    client_order_id: int,
    total_amount: float,
) -> PaymentSummaryGet:
    summary = PaymentSummary(
        client_order_id=client_order_id,
        total_amount=total_amount,
        paid_amount=0.0,
        remaining_balance=total_amount,
        balance_cleared=False,
    )

    db.add(summary)
    db.commit()
    db.refresh(summary)

    return PaymentSummaryGet.model_validate(summary)


# NOTE: update_payment_summary is commented out because PaymentSummary is a
# computed/derived entity. It should not be directly edited by users.
# Instead, use recalculate_payment_summary() which recomputes values from
# PaymentTransactions. This ensures data consistency.
#
# def update_payment_summary(
#     db: Session,
#     payment_summary: PaymentSummary,
#     payment_amount: float,
# ) -> PaymentSummaryGet:
#     payment_summary.paid_amount += payment_amount
#     payment_summary.remaining_balance -= payment_amount
#
#     if payment_summary.remaining_balance <= 0:
#         payment_summary.remaining_balance = 0
#         payment_summary.balance_cleared = True
#     else:
#         payment_summary.balance_cleared = False
#
#     db.commit()
#     db.refresh(payment_summary)
#
#     return PaymentSummaryGet.model_validate(payment_summary)






def recalculate_payment_summary(
    db: Session,
    payment_summary_id: int,
) -> None:
    """
    Recalculates PaymentSummary values based on associated PaymentTransactions.

    NOTE: This function does NOT commit. The caller is responsible for calling
    db.commit() to persist changes. This allows the caller to control the
    transaction boundary and rollback if needed.
    """
    recalculated_summary = (
        db.query(PaymentSummary)
        .filter(PaymentSummary.payment_summary_id == payment_summary_id)
        .first()
    )

    if not recalculated_summary:
        return

    total_paid = (
        db.query(func.coalesce(func.sum(PaymentTransaction.paid_amount), 0))
        .filter(PaymentTransaction.payment_summary_id == payment_summary_id)
        .scalar()
    )

    recalculated_summary.paid_amount = float(total_paid)
    recalculated_summary.remaining_balance = max(
        recalculated_summary.total_amount - recalculated_summary.paid_amount,
        0,
    )
    recalculated_summary.balance_cleared = recalculated_summary.remaining_balance == 0
