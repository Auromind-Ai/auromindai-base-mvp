import sys
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

db_url = os.getenv("DATABASE_URL")
if db_url and "@db:" in db_url:
    db_url = db_url.replace("@db:", "@localhost:")
    os.environ["DATABASE_URL"] = db_url

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/../backend")
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("Adding remaining timestamp columns to leads table...")

columns_to_add = ["archived_at", "last_activity_at", "converted_at"]

for col in columns_to_add:
    sql = f"ALTER TABLE leads ADD COLUMN IF NOT EXISTS {col} TIMESTAMP WITH TIME ZONE;"
    print(f"Running SQL: {sql}")
    try:
        db.execute(text(sql))
        db.commit()
        print(f"Added column '{col}' successfully.")
    except Exception as e:
        db.rollback()
        print(f"Failed to add column '{col}': {e}")

# Also check for constraints or unique indices
try:
    # Add unique constraint if not exists
    # First, delete existing duplicate rows if any to prevent constraint violation
    # (Since this is dev/test DB, it should be fine, but let's just create the unique index/constraint)
    print("Checking / adding unique constraint 'uq_leads_scope'...")
    # Let's add the unique constraint safely
    db.execute(text("""
        ALTER TABLE leads 
        ADD CONSTRAINT uq_leads_scope UNIQUE (workspace_id, conversation_id);
    """))
    db.commit()
    print("Unique constraint 'uq_leads_scope' added successfully.")
except Exception as e:
    db.rollback()
    print("Unique constraint might already exist or failed to add:", e)

# Also check for foreign key constraints
try:
    print("Checking / adding foreign key constraints for leads...")
    db.execute(text("""
        ALTER TABLE leads 
        ADD CONSTRAINT fk_leads_conversation_id 
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
    """))
    db.commit()
    print("Foreign key constraint fk_leads_conversation_id added successfully.")
except Exception as e:
    db.rollback()
    print("Foreign key constraint fk_leads_conversation_id might already exist or failed:", e)

db.close()
