# File: database.py (Renamed from sqlite_config.py)
import os
from dotenv import load_dotenv # 👈 REQUIRED to read .env
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL is missing from .env file!")

# Create the engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Good for handling dropped connections
    pool_size=10,        # Optional: Adjust based on your needs
    max_overflow=20      # Optional: Allow extra connections during spikes
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()