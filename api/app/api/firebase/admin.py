from fastapi import APIRouter, Depends
from app.auth.admin_auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/me")
def get_me(admin=Depends(get_current_admin)):
    return {
        "id": admin.id,
        "username": admin.username,
        "role": admin.role
    }
