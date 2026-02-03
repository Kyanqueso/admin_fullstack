from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.sqlite_config import get_db
from app.schemas.local.payment_summary import PaymentSummaryCreate, PaymentSummaryRead, PaymentSummaryUpdate
from app.services.local import payment_summary_service

router = APIRouter(prefix="/payment-summaries", tags=["Payment Summaries"])


@router.get("/", response_model=list[PaymentSummaryRead])
def get_all_payment_summary(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    return payment_summary_service.get_payment_summaries(db, skip, limit)


@router.get("/{payment_summary_id}", response_model=PaymentSummaryRead)
def get_payment_summary(payment_summary_id: int, db: Session = Depends(get_db)):
    payment_summary = payment_summary_service.get_payment_summary(db, payment_summary_id)
    if not payment_summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment Summary not found")

    return payment_summary


@router.post("/", response_model=PaymentSummaryRead, status_code=status.HTTP_201_CREATED)
def create_payment_summary(payment_summary_data: PaymentSummaryCreate, db: Session = Depends(get_db)):
    payment_summary = payment_summary_service.create_payment_summary(db, payment_summary_data)
    if not payment_summary:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create Payment Summary")

    return payment_summary


@router.patch("/{payment_summary_id}", response_model=PaymentSummaryRead)
def update_payment_summary(payment_summary_id: int, payment_summary_data: PaymentSummaryUpdate,
                           db: Session = Depends(get_db)):
    payment_summary = payment_summary_service.update_payment_summary(db, payment_summary_id, payment_summary_data)
    if not payment_summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment Summary not found")

    return payment_summary


@router.delete("/{payment_summary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment_summary(payment_summary_id: int, db: Session = Depends(get_db)):
    success = payment_summary_service.delete_payment_summary(db, payment_summary_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment Summary not found")

    return None
