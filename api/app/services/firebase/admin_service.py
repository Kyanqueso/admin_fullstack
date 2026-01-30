from sqlalchemy.orm import Session
from app.db.schema import Admin

def get_admin_by_firebase_uid(
    db: Session,
    firebase_uid: str
) -> Admin | None:
    return (
        db.query(Admin)
        .filter(Admin.firebase_uid == firebase_uid)
        .first()
    )
