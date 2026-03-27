from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.payment_transaction import PaymentTransactionCreate, PaymentTransactionRead, \
    PaymentTransactionUpdate
from app.services import payment_transaction_service
from app.db.models import PaymentSummary, PaymentTransaction

router = APIRouter(prefix="/payment-transactions", tags=["Payment Transactions"])


@router.get("/", response_model=list[PaymentTransactionRead])
def get_all_payment_transaction(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    try:
        return payment_transaction_service.get_payment_transactions(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/by-order/{original_order_id}", response_model=list[PaymentTransactionRead])
def get_transactions_by_original_order(original_order_id: int, db: Session = Depends(get_db)):
    """
    Fetch all payment transactions for a completed order using its original
    client_order_id. After order completion, payment_summaries.client_order_id
    is SET NULL — but the summary row still exists. We find it by querying
    payment_summaries where client_order_id was the original_order_id before
    nullification. Since client_order_id is now NULL, we store the mapping on
    the PaymentSummary via original_order_id column (added in migration).
    
    Fallback: scan all summaries whose transactions sum matches, or simply
    use the original_order_id stored on the summary itself.
    """
    try:
        # Find the PaymentSummary that was linked to this original order.
        # After SET NULL, client_order_id is NULL — we find it via
        # original_order_id stored on the summary (see migration below).
        summary = db.query(PaymentSummary).filter(
            PaymentSummary.original_order_id == original_order_id
        ).first()

        if not summary:
            return []

        transactions = db.query(PaymentTransaction).filter(
            PaymentTransaction.payment_summary_id == summary.id
        ).order_by(PaymentTransaction.payment_number).all()

        return transactions

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{payment_transaction_id}", response_model=PaymentTransactionRead)
def get_payment_transaction(payment_transaction_id: int, db: Session = Depends(get_db)):
    try:
        payment_transaction = payment_transaction_service.get_payment_transaction(db, payment_transaction_id)
        if not payment_transaction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment Transaction not found")
        return payment_transaction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/", response_model=PaymentTransactionRead, status_code=status.HTTP_201_CREATED)
def create_payment_transaction(payment_transaction_data: PaymentTransactionCreate, db: Session = Depends(get_db)):
    try:
        return payment_transaction_service.create_payment_transaction(db, payment_transaction_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/{payment_transaction_id}", response_model=PaymentTransactionRead)
def update_payment_transaction(payment_transaction_id: int, payment_transaction_data: PaymentTransactionUpdate,
                               db: Session = Depends(get_db)):
    try:
        payment_transaction = payment_transaction_service.update_payment_transaction(db, payment_transaction_id,
                                                                                     payment_transaction_data)
        if not payment_transaction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment Transaction not found")
        return payment_transaction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/{payment_transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment_transaction(payment_transaction_id: int, db: Session = Depends(get_db)):
    try:
        success = payment_transaction_service.delete_payment_transaction(db, payment_transaction_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment Transaction not found")
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))