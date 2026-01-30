from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Path to SQLite database file (Inside app folder)
SQLITE_DB_URL = "sqlite:///./app/localadmin.db"

# Create the SQLAlchemy engine
engine = create_engine(
    SQLITE_DB_URL, 
    connect_args={"check_same_thread": False}
)

# Create a configured "Session" class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()

# Dependency for FastAPI routes
def get_db():
    """
    Yield a database session to be used in FastAPI endpoints.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()