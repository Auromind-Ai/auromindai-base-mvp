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

print("Checking columns of leads table...")
try:
    result = db.execute(text("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'leads'
    """))
    columns = {row[0]: row[1] for row in result}
    print("Leads columns:", columns)
    
    # Check if workspace_id is in columns
    if not columns:
        print("Table 'leads' does not exist or has no columns!")
    else:
        if 'workspace_id' not in columns:
            print("Column 'workspace_id' is missing from leads table! Adding it...")
            db.execute(text("ALTER TABLE leads ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE"))
            db.commit()
            print("workspace_id added!")
            
except Exception as e:
    print("Error:", e)

db.close()
