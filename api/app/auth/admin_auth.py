from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.schema import Admin
from app.auth.firebase_auth import get_current_user
from app.config.sqlite_config import get_db, SessionLocal
from app.services.firebase.admin_service import get_admin_by_firebase_uid

def get_current_admin(
    decoded_token=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    firebase_uid = decoded_token.get("uid") or decoded_token.get("user_id")

    admin = get_admin_by_firebase_uid(db, firebase_uid)
    if not admin:
        raise HTTPException(
            status_code=403,
            detail="Admin not registered"
        )

    return admin

# Function to seed an admin user
def seed_admin():
    db = SessionLocal()
    try:
        firebase_uid = "QoscNDuYIkQjRRyc6q2enJrly4h2"  # Put the Firebase UID here
        admin = db.query(Admin).filter_by(firebase_uid=firebase_uid).first()
        if not admin:
            new_admin = Admin(
                firebase_uid=firebase_uid,
                email="admin@test.com",
                username="admin",
                first_name="Admin",
                last_name="User",
                role="superadmin"
            )
            db.add(new_admin)
            db.commit()
            print("Admin user seeded in DB")
        else:
            print("Admin already exists in DB")
    finally:
        db.close()