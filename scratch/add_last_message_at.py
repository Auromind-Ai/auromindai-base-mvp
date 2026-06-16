import sys
import os
from dotenv import load_dotenv

# Load env variables from backend/.env
load_dotenv("backend/.env")

db_url = os.getenv("DATABASE_URL")
if db_url and "@db:" in db_url:
    db_url = db_url.replace("@db:", "@localhost:")
    os.environ["DATABASE_URL"] = db_url

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/../backend")
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("Checking columns of conversations table...")
result = db.execute(text("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'conversations'
"""))
columns = {row[0]: row[1] for row in result}
print("Current columns:", columns)

if 'last_message_at' not in columns:
    print("Column last_message_at is missing. Adding it...")
    db.execute(text("ALTER TABLE conversations ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now()"))
    db.commit()
    print("Column last_message_at added successfully!")
else:
    print("Column last_message_at already exists.")

db.close()
