"""
Initialize database tables

Run this script to create all tables in the database.
"""
from app.database import engine, Base
from app.models import User, Conversation, Message
# from app.models.followup import Followup
# from app.models.promise import Promise
# from app.models.brain import BrainEntry
# from app.models.ai_action import AIAction

def init_db():
    """Create all tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

if __name__ == "__main__":
    init_db()
