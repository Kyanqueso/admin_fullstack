from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config.sqlite_config import get_db
from app.model.local.payment_transaction import (
    PaymentTransactionGet,
    PaymentTransactionCreate,
    PaymentTransactionUpdate,
)
from app.services.local.payment_transaction_service import (
    get_payment_transaction_by_id,
    get_payment_transactions_by_summary,
    create_payment_transaction,
    update_payment_transaction,
    delete_payment_transaction,
)

router = APIRouter(
    prefix="/payment-transactions",
    tags=["Payment Transactions"],
)

@router.get(
    "/{payment_transaction_id}",
    response_model=PaymentTransactionGet,
)
def get_payment_transaction_endpoint(
    payment_transaction_id: int,
    db: Session = Depends(get_db),
):
    transaction = get_payment_transaction_by_id(
        db,
        payment_transaction_id,
    )

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment transaction not found",
        )

    return transaction


@router.get(
    "/by-summary/{payment_summary_id}",
    response_model=list[PaymentTransactionGet],
)
def get_payment_transactions_by_summary_endpoint(
    payment_summary_id: int,
    db: Session = Depends(get_db),
):
    return get_payment_transactions_by_summary(
        db,
        payment_summary_id,
    )


@router.post(
    "/",
    response_model=PaymentTransactionGet,
    status_code=status.HTTP_201_CREATED,
)
def create_payment_transaction_endpoint(
    data: PaymentTransactionCreate,
    db: Session = Depends(get_db),
):
    return create_payment_transaction(db, data)


@router.patch(
    "/{payment_transaction_id}",
    response_model=PaymentTransactionGet,
)
def update_payment_transaction_endpoint(
    payment_transaction_id: int,
    update: PaymentTransactionUpdate,
    db: Session = Depends(get_db),
):
    transaction = update_payment_transaction(
        db,
        payment_transaction_id,
        update,
    )

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment transaction not found",
        )

    return transaction


@router.delete(
    "/{payment_transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_payment_transaction_endpoint(
    payment_transaction_id: int,
    db: Session = Depends(get_db),
):
    success = delete_payment_transaction(
        db,
        payment_transaction_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment transaction not found",
        )