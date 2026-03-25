from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.analytics import AnalyticsRead, AnnualSalesBreakdownRead, UncollectedBalanceItem
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/", response_model=AnalyticsRead)
def get_analytics(db: Session = Depends(get_db)):
    return analytics_service.get_analytics(db)

@router.get("/annual-breakdown", response_model=AnnualSalesBreakdownRead)
def get_annual_sales_breakdown(year_number: int = None, db: Session = Depends(get_db)):
    return analytics_service.get_annual_sales_breakdown(db, year_number)

@router.get("/uncollected-balances", response_model=list[UncollectedBalanceItem])
def get_uncollected_balances(db: Session = Depends(get_db)):
    return analytics_service.get_uncollected_balance(db)