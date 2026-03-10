"""
Initialize database tables

Run this script to create all tables in the database.
"""
<<<<<<< HEAD
from sqlalchemy import text
from app.database import engine, Base
=======
from app.database import engine, Base, SessionLocal
>>>>>>> dev
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
    
    # Enable pgvector extension first
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
    
    # Add missing columns to existing tables if they don't exist
    with engine.connect() as conn:
        # Check and add password_hash column to users table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash'"))
        if not result.fetchone():
            print("Adding password_hash column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
            conn.commit()
        
        # Check and add is_active column to users table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='is_active'"))
        if not result.fetchone():
            print("Adding is_active column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
            conn.commit()
        
        # Check and add created_by column to workspaces table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='workspaces' AND column_name='created_by'"))
        if not result.fetchone():
            print("Adding created_by column to workspaces table...")
            conn.execute(text("ALTER TABLE workspaces ADD COLUMN created_by VARCHAR(36) REFERENCES users(id)"))
            conn.commit()
        
        # Check and add updated_at column to workspaces table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='workspaces' AND column_name='updated_at'"))
        if not result.fetchone():
            print("Adding updated_at column to workspaces table...")
            conn.execute(text("ALTER TABLE workspaces ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()"))
            conn.commit()
        
        # Check and add workspace_id column to conversations table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='conversations' AND column_name='workspace_id'"))
        if not result.fetchone():
            print("Adding workspace_id column to conversations table...")
            conn.execute(text("ALTER TABLE conversations ADD COLUMN workspace_id VARCHAR(36) REFERENCES workspaces(id) ON DELETE CASCADE"))
            conn.commit()
        
        # Check and add title column to conversations table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='conversations' AND column_name='title'"))
        if not result.fetchone():
            print("Adding title column to conversations table...")
            conn.execute(text("ALTER TABLE conversations ADD COLUMN title VARCHAR(255)"))
            conn.commit()
        
        # Check and add role column to messages table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='messages' AND column_name='role'"))
        if not result.fetchone():
            print("Adding role column to messages table...")
            conn.execute(text("ALTER TABLE messages ADD COLUMN role VARCHAR(50)"))
            conn.commit()
        
        # Check and add created_at column to workspace_members table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='workspace_members' AND column_name='created_at'"))
        if not result.fetchone():
            print("Adding created_at column to workspace_members table...")
            conn.execute(text("ALTER TABLE workspace_members ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now()"))
            conn.commit()
        
        # Update followups table schema (this is complex, let's recreate if needed)
        # For now, let's just ensure the columns exist
        followup_columns = ['conversation_id', 'scheduled_at', 'message_content', 'followup_count', 'mcp_decision', 'mcp_reason', 'executed_at']
        for col in followup_columns:
            result = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='followups' AND column_name='{col}'"))
            if not result.fetchone():
                print(f"Adding {col} column to followups table...")
                if col == 'conversation_id':
                    conn.execute(text("ALTER TABLE followups ADD COLUMN conversation_id VARCHAR(36) REFERENCES conversations(id) ON DELETE CASCADE"))
                elif col == 'scheduled_at':
                    conn.execute(text("ALTER TABLE followups ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL"))
                elif col in ['message_content', 'mcp_reason']:
                    conn.execute(text(f"ALTER TABLE followups ADD COLUMN {col} TEXT"))
                elif col == 'followup_count':
                    conn.execute(text(f"ALTER TABLE followups ADD COLUMN {col} INTEGER DEFAULT 0"))
                elif col in ['mcp_decision', 'executed_at']:
                    if col == 'executed_at':
                        conn.execute(text(f"ALTER TABLE followups ADD COLUMN {col} TIMESTAMP WITH TIME ZONE"))
                    else:
                        conn.execute(text(f"ALTER TABLE followups ADD COLUMN {col} VARCHAR(50)"))
                conn.commit()
        
        # Update promises table schema
        promise_columns = ['description', 'due_date', 'source', 'ai_action_id', 'resolved_at']
        for col in promise_columns:
            result = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='promises' AND column_name='{col}'"))
            if not result.fetchone():
                print(f"Adding {col} column to promises table...")
                if col == 'description':
                    conn.execute(text("ALTER TABLE promises ADD COLUMN description TEXT NOT NULL"))
                    # Copy data from promise_text if it exists
                    conn.execute(text("UPDATE promises SET description = promise_text WHERE description IS NULL"))
                elif col == 'due_date':
                    conn.execute(text("ALTER TABLE promises ADD COLUMN due_date DATE"))
                elif col == 'source':
                    conn.execute(text("ALTER TABLE promises ADD COLUMN source VARCHAR(50) DEFAULT 'manual'"))
                elif col == 'ai_action_id':
                    conn.execute(text("ALTER TABLE promises ADD COLUMN ai_action_id VARCHAR(36) REFERENCES ai_actions(id) ON DELETE SET NULL"))
                elif col == 'resolved_at':
                    conn.execute(text("ALTER TABLE promises ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE"))
                conn.commit()
        
        # Update ai_actions table schema
        ai_action_columns = ['intent', 'intent_raw', 'confidence', 'mcp_decision', 'mcp_reason', 'rule_results', 'context_refs', 'execution_status', 'human_override', 'action_metadata']
        for col in ai_action_columns:
            result = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='ai_actions' AND column_name='{col}'"))
            if not result.fetchone():
                print(f"Adding {col} column to ai_actions table...")
                if col in ['intent', 'intent_raw', 'mcp_reason']:
                    conn.execute(text(f"ALTER TABLE ai_actions ADD COLUMN {col} TEXT"))
                elif col == 'confidence':
                    conn.execute(text(f"ALTER TABLE ai_actions ADD COLUMN {col} FLOAT"))
                elif col in ['mcp_decision', 'execution_status']:
                    conn.execute(text(f"ALTER TABLE ai_actions ADD COLUMN {col} VARCHAR(50)"))
                elif col in ['rule_results', 'context_refs', 'action_metadata']:
                    conn.execute(text(f"ALTER TABLE ai_actions ADD COLUMN {col} JSONB"))
                elif col == 'human_override':
                    conn.execute(text(f"ALTER TABLE ai_actions ADD COLUMN {col} BOOLEAN DEFAULT FALSE"))
                conn.commit()
        
        # Rename learning_events table to ai_learning_events and update schema
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name='ai_learning_events'"))
        if not result.fetchone():
            result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name='learning_events'"))
            if result.fetchone():
                print("Renaming learning_events to ai_learning_events...")
                conn.execute(text("ALTER TABLE learning_events RENAME TO ai_learning_events"))
                conn.commit()
            
            # Add new columns to ai_learning_events
            learning_columns = ['user_message', 'ai_response', 'conversation_id', 'ai_action_id', 'mcp_verdict', 'mcp_confidence', 'feedback_type', 'feedback_comment', 'feedback_timestamp', 'execution_success', 'user_satisfaction_score', 'pattern_tags', 'used_in_training', 'promoted_to_rule']
            for col in learning_columns:
                result = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='ai_learning_events' AND column_name='{col}'"))
                if not result.fetchone():
                    print(f"Adding {col} column to ai_learning_events table...")
                    if col in ['user_message', 'ai_response', 'feedback_comment']:
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} TEXT"))
                    elif col in ['conversation_id', 'ai_action_id']:
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} VARCHAR(36)"))
                    elif col in ['mcp_verdict', 'feedback_type']:
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} VARCHAR(50)"))
                    elif col in ['mcp_confidence', 'user_satisfaction_score']:
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} FLOAT"))
                    elif col == 'feedback_timestamp':
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} TIMESTAMP WITH TIME ZONE"))
                    elif col in ['execution_success', 'used_in_training', 'promoted_to_rule']:
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} BOOLEAN DEFAULT FALSE"))
                    elif col == 'pattern_tags':
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} JSONB"))
                    conn.commit()
    
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
