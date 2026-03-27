from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.completed_order import CompletedOrderRead
from app.db.models import CompletedOrder, PaymentSummary

router = APIRouter(prefix="/completed-orders", tags=["Completed Orders"])


@router.get("/", response_model=list[CompletedOrderRead])
def get_all_completed_orders(
    skip: int = 0,
    limit: int = 10000,
    db: Session = Depends(get_db)
):
    try:
        return db.query(CompletedOrder).offset(skip).limit(limit).all()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{completed_order_id}", response_model=CompletedOrderRead)
def get_completed_order(completed_order_id: int, db: Session = Depends(get_db)):
    try:
        order = db.query(CompletedOrder).filter(CompletedOrder.id == completed_order_id).first()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Completed order not found")
        return order
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/{completed_order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_completed_order(completed_order_id: int, db: Session = Depends(get_db)):
    """
    Delete a completed order record and its associated PaymentSummary
    (and PaymentTransactions via cascade). This removes all history for
    this order permanently.
    """
    try:
        order = db.query(CompletedOrder).filter(CompletedOrder.id == completed_order_id).first()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Completed order not found")

        # Also clean up the orphaned PaymentSummary (client_order_id is NULL
        # since the original ClientOrder was deleted on completion).
        if order.original_order_id:
            orphaned_summary = db.query(PaymentSummary).filter(
                PaymentSummary.original_order_id == order.original_order_id
            ).first()
            if orphaned_summary:
                db.delete(orphaned_summary)  # cascades to PaymentTransactions

        db.delete(order)
        db.commit()
        return None

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))