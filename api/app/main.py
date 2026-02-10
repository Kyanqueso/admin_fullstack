from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config.database import engine
from app.config.auth import get_current_user

from app.db.base import Base

from app.api.company_router import router as company_router
from app.api.client_router import router as client_router
from app.api.client_order_router import router as client_order_router
from app.api.payment_summary_router import router as payment_summary_router
from app.api.payment_transaction_router import router as payment_transaction_router
from app.api.analytics_router import router as analytics_router
from app.api.shoe_management_router import router as shoe_management_router

from app.api.test_routes import router as test_router


app = FastAPI(
    title="Theresa Shoes API",
    description="Backend API for Theresa Shoes inventory and payment management",
    version="2.0.0"
)

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Theresa Shoes API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Requires authentication
app.include_router(company_router, dependencies=[Depends(get_current_user)])
app.include_router(client_router, dependencies=[Depends(get_current_user)])
app.include_router(client_order_router, dependencies=[Depends(get_current_user)])
app.include_router(payment_summary_router, dependencies=[Depends(get_current_user)])
app.include_router(payment_transaction_router, dependencies=[Depends(get_current_user)])
app.include_router(analytics_router, dependencies=[Depends(get_current_user)])

# Does not require authentication
app.include_router(shoe_management_router)
app.include_router(test_router)