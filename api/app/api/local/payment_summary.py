from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config.sqlite_config import get_db
from app.model.local.payment_summary import PaymentSummaryGet
from app.services.local.payment_summary_service import (
    get_payment_summary_by_order_id,
    get_payment_summaries_by_company_id,
)

router = APIRouter(
    prefix="/payment-summaries",
    tags=["Payment Summaries"],
)

@router.get("/{client_order_id}", response_model=PaymentSummaryGet)
def get_payment_summary(
    client_order_id: int,
    db: Session = Depends(get_db),
):
    summary = get_payment_summary_by_order_id(db, client_order_id)

    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment summary not found for this order",
        )

    return summary


@router.get(
    "/company/{company_id}",
    response_model=list[PaymentSummaryGet],
)
def get_payment_summaries_by_company(
    company_id: int,
    db: Session = Depends(get_db),
):
    return get_payment_summaries_by_company_id(db, company_id)

"""
@router.post(
    "/",
    response_model=PaymentSummaryGet,
    status_code=status.HTTP_201_CREATED,
)
def create_payment_summary_endpoint(
    client_order_id: int,
    db: Session = Depends(get_db),
):
    summary = create_payment_summary(
        db=db,
        client_order_id=client_order_id,
    )

    return PaymentSummaryGet(
        paymentSummaryId=summary.paymentSummaryId,
        client_order_id=summary.client_order_id,
        total_Amount=summary.paidAmount,
        remainingBalance=summary.remainingBalance,
        balanceCleared=summary.balanceCleared,
    )

@router.patch(
    "/{client_order_id}",
    response_model=PaymentSummaryGet,
)
def update_payment_summary_endpoint(
    client_order_id: int,
    payment_amount: float,
    db: Session = Depends(get_db),
):
    summary = (
        db.query(PaymentSummary)
        .filter(PaymentSummary.client_order_id == client_order_id)
        .first()
    )

    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment summary not found for this order",
        )

    updated = update_payment_summary(
        db=db,
        payment_summary=summary,
        payment_amount=payment_amount,
    )

    return PaymentSummaryGet(
        paymentSummaryId=updated.paymentSummaryId,
        client_order_id=updated.client_order_id,
        paidAmount=updated.paidAmount,
        remainingBalance=updated.remainingBalance,
        balanceCleared=updated.balanceCleared,
    )
"""