from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

# Import to ensure Firebase is initialized before using auth
import app.config.firebase_config  # noqa: F401

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    token = credentials.credentials

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Firebase token"
        )
