"""
Initialize database tables

Run this script to create all tables in the database.
"""
from app.database import engine, Base
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.followup import Followup
from app.models.promise import Promise
from app.models.brain import BrainEntry, BrainChunk
from app.models.ai_action import AIAction
from app.models.workspace import Workspace, WorkspaceMember
from app.models.learning_event import LearningEvent

def init_db():
    """Create all tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

if __name__ == "__main__":
    init_db()
