"""
Database migration to create integrations table
Run with: python -m app.scripts.create_integrations_table
"""
from app.database import engine, Base
from app.models.integration import Integration

def create_integrations_table():
    print("Creating integrations table...")
    Base.metadata.create_all(bind=engine, tables=[Integration.__table__])
    print("✅ Integrations table created successfully!")

if __name__ == "__main__":
    create_integrations_table()
