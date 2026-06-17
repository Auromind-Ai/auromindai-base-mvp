import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal, engine
from sqlalchemy import text

def check():
    db = SessionLocal()
    try:
        print("Connected to DB successfully.")
        # Check tables
        tables = ["users", "workspaces", "workspace_members", "leads", "conversations", "messages", "followups"]
        for table in tables:
            try:
                res = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                print(f"Table '{table}' has {res} rows.")
            except Exception as e:
                print(f"Error checking table '{table}': {e}")
                db.rollback()
    except Exception as e:
        print("Error connecting:", e)
    finally:
        db.close()

if __name__ == "__main__":
    check()
