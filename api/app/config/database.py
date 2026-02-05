import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from supabase import create_client, Client

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing from .env file!")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL or SUPABASE_KEY is missing from .env file!")

# Supabase client for storage operations
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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