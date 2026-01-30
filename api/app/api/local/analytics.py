from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config.sqlite_config import get_db
from app.model.local.analytics import (
    AnalyticsGet,
)
from app.services.local.analytics_service import (
    get_analytics
)


router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/", response_model=AnalyticsGet)
def get_analytics_endpoint(db: Session = Depends(get_db)):
    return get_analytics(db)
