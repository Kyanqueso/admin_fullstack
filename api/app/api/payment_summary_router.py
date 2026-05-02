from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.payment_summary import PaymentSummaryRead, PaymentSummaryUpdate
from app.services import payment_summary_service

router = APIRouter(prefix="/payment-summaries", tags=["Payment Summaries"])


@router.get("/", response_model=list[PaymentSummaryRead])
def get_all_payment_summary(skip: int = 0, limit: int = 10000, archived: bool = False, db: Session = Depends(get_db)):
    return payment_summary_service.get_payment_summaries(db, skip, limit, archived=archived)


@router.get("/{payment_summary_id}", response_model=PaymentSummaryRead)
def get_payment_summary(payment_summary_id: int, db: Session = Depends(get_db)):
    payment_summary = payment_summary_service.get_payment_summary(db, payment_summary_id)
    if not payment_summary or payment_summary.isDeleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment summary not found")

    return payment_summary


@router.patch("/{payment_summary_id}", response_model=PaymentSummaryRead)
def update_payment_summary(payment_summary_id: int, payment_summary_data: PaymentSummaryUpdate,
                           db: Session = Depends(get_db)):
    payment_summary = payment_summary_service.get_payment_summary(db, payment_summary_id)
    if not payment_summary or payment_summary.isDeleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment summary not found")

    updated = payment_summary_service.update_payment_summary(db, payment_summary_id, payment_summary_data)
    return updated