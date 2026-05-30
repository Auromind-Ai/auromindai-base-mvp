import sys
import os
from dotenv import load_dotenv

# Load env variables from backend/.env
load_dotenv("backend/.env")

import os
db_url = os.getenv("DATABASE_URL")
if db_url and "@db:" in db_url:
    db_url = db_url.replace("@db:", "@localhost:")
    os.environ["DATABASE_URL"] = db_url

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/../backend")
from app.database import SessionLocal, engine
from sqlalchemy import text

db = SessionLocal()

print("--- TABLES ---")
result = db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
for row in result:
    print(row[0])

print("\n--- ALEMBIC VERSION ---")
try:
    result = db.execute(text("SELECT * FROM alembic_version"))
    for row in result:
        print(row)
except Exception as e:
    print("Error querying alembic_version:", e)

db.close()
