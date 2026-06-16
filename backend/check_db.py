import os
from sqlalchemy import create_engine, text
from app.core.config import settings

# Use the configuration settings for the database URL
db_url = settings.DATABASE_URL
engine = create_engine(db_url)

with engine.connect() as conn:
    r = conn.execute(text("SELECT id, email, preferences FROM users LIMIT 5;"))
    print("Users in database:")
    for row in r:
        print(f"  ID: {row[0]}, Email: {row[1]}, Preferences: {row[2]}")
