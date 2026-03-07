from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://9ae2d0539fb6e6a1ad0fe4879e50f4bc458d853156929da5ce018092b9f249cc:sk_VtN3YJ2d1xbWIvmVFTMTD@db.prisma.io:5432/postgres?sslmode=require")

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
