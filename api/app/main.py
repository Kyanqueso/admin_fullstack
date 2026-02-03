from fastapi import FastAPI
from app.config.sqlite_config import engine

from app.db.base import Base

from app.api.local.company_router import router as company_router
from app.api.local.client_router import router as client_router
from app.api.local.client_order_router import router as client_order_router
from app.api.local.payment_summary_router import router as payment_summary_router
from app.api.local.payment_transaction_router import router as payment_transaction_router
from app.api.local.analytics_router import router as analytics_router
from app.api.local.shoe_management_router import router as shoe_management_router


app = FastAPI(
    title="Theresa Shoes API",
    description="Backend API for Theresa Shoes inventory and payment management",
    version="2.0.0"
)

@app.get("/")
def root():
    return {"message": "Theresa Shoes API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

app.include_router(company_router)
app.include_router(client_router)
app.include_router(client_order_router)
app.include_router(payment_summary_router)
app.include_router(payment_transaction_router)
app.include_router(analytics_router)
app.include_router(shoe_management_router)
