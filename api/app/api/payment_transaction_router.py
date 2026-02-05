from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.payment_transaction import PaymentTransactionCreate, PaymentTransactionRead, \
    PaymentTransactionUpdate
from app.services import payment_transaction_service

router = APIRouter(prefix="/payment-transactions", tags=["Payment Transactions"])


@router.get("/", response_model=list[PaymentTransactionRead])
def get_all_payment_transaction(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    return payment_transaction_service.get_payment_transactions(db, skip=skip, limit=limit)


@router.get("/{payment_transaction_id}", response_model=PaymentTransactionRead)
def get_payment_transaction(payment_transaction_id: int, db: Session = Depends(get_db)):
    payment_transaction = payment_transaction_service.get_payment_transaction(db, payment_transaction_id)
    if not payment_transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment Transaction not found")

    return payment_transaction


@router.post("/", response_model=PaymentTransactionRead, status_code=status.HTTP_201_CREATED)
def create_payment_transaction(payment_transaction_data: PaymentTransactionCreate, db: Session = Depends(get_db)):
    payment_transaction = payment_transaction_service.create_payment_transaction(db, payment_transaction_data)
    if not payment_transaction:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create Payment Transaction")

    return payment_transaction


@router.patch("/{payment_transaction_id}", response_model=PaymentTransactionRead)
def update_payment_transaction(payment_transaction_id: int, payment_transaction_data: PaymentTransactionUpdate,
                               db: Session = Depends(get_db)):
    payment_transaction = payment_transaction_service.update_payment_transaction(db, payment_transaction_id,
                                                                                 payment_transaction_data)
    if not payment_transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment Transaction not found")

    return payment_transaction


@router.delete("/{payment_transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment_transaction(payment_transaction_id: int, db: Session = Depends(get_db)):
    success = payment_transaction_service.delete_payment_transaction(db, payment_transaction_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment Transaction not found")

    return None
