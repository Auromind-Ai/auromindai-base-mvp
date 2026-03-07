"""
Initialize database tables

Run this script to create all tables in the database.
"""
from app.database import engine, Base, SessionLocal
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.followup import Followup
from app.models.promise import Promise
from app.models.brain import BrainEntry, BrainChunk
from app.models.ai_action import AIAction
from app.models.workspace import Workspace, WorkspaceMember
from app.models.learning_event import LearningEvent
from app.models.platform_setting import PlatformSetting
from app.services.platform_settings_service import initialize_default_settings

def init_db():
    """Create all tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

    # Initialize default platform settings
    print("Initializing default platform settings...")
    db = SessionLocal()
    try:
        initialize_default_settings(db)
        print("✅ Default platform settings initialized!")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
