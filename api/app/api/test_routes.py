from fastapi import APIRouter, Depends
from app.config.auth import get_current_user

router = APIRouter()

@router.get("/protected")
def protected(user=Depends(get_current_user)):

    return {
        "message": "You are authenticated",
        "user_id": user["sub"]
    }
