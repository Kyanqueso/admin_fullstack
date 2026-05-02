from app.schemas.admin_account import AdminCreate, AdminRead
from app.config.database import supabase_admin


def get_all_admins() -> list[AdminRead]:
    try:
        users = supabase_admin.auth.admin.list_users()
        result = []
        for user in users:
            metadata = user.user_metadata or {}
            result.append(AdminRead(
                uid=user.id,
                email=user.email or '',
                first_name=metadata.get('first_name', ''),
                last_name=metadata.get('last_name', '')
            ))
        return result
    except Exception as e:
        raise ValueError(f"Failed to fetch users from Supabase: {str(e)}")


def create_admin(data: AdminCreate) -> AdminRead:
    try:
        result = supabase_admin.auth.admin.create_user({
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
            "user_metadata": {
                "first_name": data.first_name,
                "last_name": data.last_name
            }
        })
        user = result.user
        metadata = user.user_metadata or {}
        return AdminRead(
            uid=user.id,
            email=user.email or '',
            first_name=metadata.get('first_name', data.first_name),
            last_name=metadata.get('last_name', data.last_name)
        )
    except Exception as e:
        msg = str(e).lower()
        if 'already' in msg or 'exists' in msg or 'duplicate' in msg:
            raise ValueError("An admin with this email already exists")
        raise ValueError(f"Failed to create account: {str(e)}")


def delete_admin(uid: str) -> bool | None:
    try:
        supabase_admin.auth.admin.delete_user(uid)
        return True
    except Exception as e:
        msg = str(e).lower()
        if 'not found' in msg or '404' in msg:
            return None
        raise ValueError(f"Failed to delete user: {str(e)}")
