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
from app.models.ai_action import Lead
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import UUID, JSONB

db = SessionLocal()

print("Inspecting Leads model vs database table 'leads'...")
result = db.execute(text("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'leads'
"""))
db_columns = {row[0] for row in result}
print("Columns currently in database 'leads' table:", db_columns)

# Get columns from SQLAlchemy model
model_columns = Lead.__table__.columns
print("\nComparing columns...")

for col in model_columns:
    if col.name not in db_columns:
        print(f"Column '{col.name}' is missing in database. Adding it...")
        # Build SQL based on column type
        type_str = str(col.type)
        
        # Mapping types
        if type_str.startswith("VARCHAR") or type_str.startswith("String"):
            sql_type = "CHARACTER VARYING"
            if getattr(col.type, 'length', None):
                sql_type += f"({col.type.length})"
        elif type_str.startswith("UUID"):
            sql_type = "UUID"
        elif type_str.startswith("TIMESTAMP") or type_str.startswith("DateTime"):
            sql_type = "TIMESTAMP WITH TIME ZONE"
        elif type_str.startswith("TEXT") or type_str.startswith("Text"):
            sql_type = "TEXT"
        elif type_str.startswith("INTEGER") or type_str.startswith("Integer"):
            sql_type = "INTEGER"
        elif type_str.startswith("FLOAT") or type_str.startswith("Float"):
            sql_type = "DOUBLE PRECISION"
        elif type_str.startswith("BOOLEAN") or type_str.startswith("Boolean"):
            sql_type = "BOOLEAN"
        elif type_str.startswith("NUMERIC") or type_str.startswith("Numeric"):
            sql_type = "NUMERIC(12, 2)"
        elif type_str.startswith("JSON") or type_str.startswith("JSONB"):
            sql_type = "JSON"
        else:
            sql_type = type_str
            
        default_clause = ""
        if col.server_default is not None:
            # simple check for now
            default_clause = f" DEFAULT {col.server_default.arg}"
        elif col.default is not None and not callable(col.default.arg):
            default_clause = f" DEFAULT '{col.default.arg}'"
        
        if col.name == "is_favorite":
            default_clause = " DEFAULT FALSE"
        elif col.name == "is_converted":
            default_clause = " DEFAULT FALSE"
            
        nullable_str = "NULL" if col.nullable else "NOT NULL"
        # Since we are adding to an existing table, it's safer to add nullable first, then populate, or just make it nullable.
        # Let's make columns nullable to avoid migration blockages on existing rows
        sql = f"ALTER TABLE leads ADD COLUMN {col.name} {sql_type}{default_clause}"
        print(f"Running SQL: {sql}")
        try:
            db.execute(text(sql))
            db.commit()
            print(f"Added column '{col.name}' successfully.")
        except Exception as ex:
            db.rollback()
            print(f"Failed to add '{col.name}': {ex}")

# Let's also check if there is a foreign key or unique constraint missing
print("\nSchema sync complete.")
db.close()
