from fastapi import FastAPI
from app.config.sqlite_config import engine, Base
from app.auth.admin_auth import seed_admin

from app.api.local.company import router as company_router
from app.api.local.client import router as client_router
from app.api.local.client_order import router as client_order_router
from app.api.local.payment_summary import router as payment_summary_router
from app.api.local.payment_transaction import router as payment_transaction_router
from app.api.local.analytics import router as analytics_router

from app.api.firebase.shoe_catalog import router as shoe_catalog_router
from app.api.firebase.admin import router as admin_router

app = FastAPI(title="Theresa Shoes FastAPI Backend")

# Create tables AFTER models are imported
Base.metadata.create_all(bind=engine)

# Create admin user if not exists
seed_admin()

@app.get("/")
def root():
    return {"status": "running"}

# Sqlite
app.include_router(company_router)
app.include_router(client_router)
app.include_router(client_order_router)
app.include_router(payment_summary_router)
app.include_router(payment_transaction_router)
app.include_router(analytics_router)

# Firebase
app.include_router(admin_router)
app.include_router(shoe_catalog_router)