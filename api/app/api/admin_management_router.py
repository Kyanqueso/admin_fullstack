from fastapi import APIRouter, Depends, HTTPException, status
from app.config.auth import get_current_user
from app.schemas.admin_account import AdminCreate, AdminRead
from app.services import admin_management_service

router = APIRouter(prefix="/admin-accounts", tags=["Admin Management"])


@router.get("/", response_model=list[AdminRead])
def get_admins(_user=Depends(get_current_user)):
    try:
        return admin_management_service.get_all_admins()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/", response_model=AdminRead, status_code=status.HTTP_201_CREATED)
def create_admin(data: AdminCreate, _user=Depends(get_current_user)):
    try:
        return admin_management_service.create_admin(data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{uid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin(uid: str, user=Depends(get_current_user)):
    # JWT 'sub' claim is the Supabase UID — use it directly for self-deletion guard
    if uid == user.get("sub", ""):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own account"
        )
    try:
        result = admin_management_service.delete_admin(uid)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return None
