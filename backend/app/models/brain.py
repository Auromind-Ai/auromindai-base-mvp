from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Float, Boolean, Integer
from sqlalchemy.sql import func
from app.database import Base
import uuid
from sqlalchemy.dialects.postgresql import UUID
# Note: This assumes pgvector extension is installed
# CREATE EXTENSION vector;
try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    # Fallback if pgvector not installed yet
    Vector = None

class BrainEntry(Base):
    __tablename__ = "brain"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"))
    title = Column(String(255))
    content = Column(Text, nullable=False)
    content_type = Column(String(50))  # text, pdf
    # Embedding vector - 1536 dimensions for OpenAI embeddings
    # embedding = Column(Vector(1536)) if Vector else Column(Text)
    # Embedding vector - 1536 dimensions for OpenAI embeddings (768 for Gemini/Llama)
    # Embedding vector - 1536 dimensions for OpenAI embeddings (768 for Gemini/Llama)
    embedding = Column(Vector(384)) # Using 384 for all-MiniLM-L6-v2
    # embedding = Column(Text)  # Fallback removed
    version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Async Processing Status
    status = Column(String(20), default="completed")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True) # Support for region, language, etc.

class BrainChunk(Base):
    __tablename__ = "brain_chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entry_id = Column(UUID(as_uuid=True), ForeignKey("brain.id", ondelete="CASCADE"))
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(384))
    chunk_index = Column(Integer)
    metadata_json = Column(Text) # JSON string for flexibility
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ConversationThread(Base):
    __tablename__ = "conversation_threads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    workspace_id = Column(
        String(36),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True
    )

    thread_id = Column(String(255), index=True)

    sender_email = Column(String(255))
    subject = Column(Text)

    conversation_summary = Column(Text)
    last_category = Column(String(50))
    last_priority = Column(String(20))

    status = Column(String(20), default="open")  # open / closed / waiting

    last_message_id = Column(String(255))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MCPDecision(Base):
    __tablename__ = "mcp_decisions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    workspace_id = Column(
        String(36),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True
    )

    message_id = Column(String(255), index=True)
    thread_id = Column(String(255), index=True)

    category = Column(String(50))
    priority = Column(String(20))
    confidence = Column(Float)

    entities_json = Column(Text)  # structured extracted data
    summary = Column(Text)
    suggested_reply = Column(Text)

    requires_user_permission = Column(Boolean, default=False)
    user_action = Column(String(20))  # pending / approved / rejected

    executed_actions_json = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

class EmailMessage(Base):
    __tablename__ = "emails"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True
    )

    gmail_message_id = Column(String(255), unique=True, index=True)
    thread_id = Column(String(255), index=True)

    sender = Column(String(255), index=True)
    recipient = Column(String(255))
    subject = Column(Text)
    body = Column(Text)

    direction = Column(String(20))  # inbound / outbound

    is_processed = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True))
    stored_at = Column(DateTime(timezone=True), server_default=func.now())