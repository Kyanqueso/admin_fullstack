from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.analytics import AnalyticsRead, AnnualSalesBreakdownRead, UncollectedBalanceItem
from app.services import analytics_service
from datetime import datetime, timezone

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

@router.get("/download-report")
def download_report(db: Session = Depends(get_db)):
    data = analytics_service.generate_full_report(db)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"TheresaShoes_Report_{today}.xlsx"
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )