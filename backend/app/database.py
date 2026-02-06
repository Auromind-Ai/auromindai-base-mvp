from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://auromind:santhoshr123@localhost:5432/auromind")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Test connections before using (Vital for Cloud DBs)
    pool_size=10,        # Keep 10 connections open
    max_overflow=20      # Allow up to 20 during spikes
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for database sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
