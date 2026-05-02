from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.config.auth import get_current_user
from app.config.database import get_db
from app.db.models import Admin

router = APIRouter()

@router.get("/protected")
def protected(user=Depends(get_current_user)):
    """
    Protected endpoint for email/password login.
    Only verifies valid Supabase JWT token.
    """
    return {
        "message": "You are authenticated",
        "user_id": user["sub"]
    }

@router.get("/protected/oauth")
def protected_oauth(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Protected endpoint for OAuth login (Google).
    Verifies JWT token AND checks if email exists in admins table.
    """
    # Get user email from JWT token
    user_email = user.get("email")

    if not user_email:
        raise HTTPException(
            status_code=401,
            detail="Email not found in token"
        )

    # Check if email exists in admins table
    admin = db.query(Admin).filter(Admin.account == user_email).first()

    if not admin:
        raise HTTPException(
            status_code=403,
            detail="Access denied. Your Google account is not authorized to access this admin portal."
        )

    return {
        "message": "You are authenticated and authorized",
        "user_id": user["sub"],
        "email": user_email,
        "admin_id": admin.id
    }
