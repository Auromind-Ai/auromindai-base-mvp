from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Float, Boolean, Integer
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = None


# ==============================
# Brain Knowledge Base
# ==============================

class BrainEntry(Base):
    __tablename__ = "brain"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True
    )

    title = Column(String(255))
    content = Column(Text, nullable=False)

    content_type = Column(String(50))  # text / pdf

    embedding = Column(Vector(384)) if Vector else Column(Text)

    version = Column(Integer, default=1)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    status = Column(String(20), default="completed")  # pending / processing / completed / failed
    error_message = Column(Text)
    metadata_json = Column(Text)


# ==============================
# Brain Chunks
# ==============================

class BrainChunk(Base):
    __tablename__ = "brain_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    entry_id = Column(
        UUID(as_uuid=True),
        ForeignKey("brain.id", ondelete="CASCADE")
    )

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True
    )

    content = Column(Text, nullable=False)

    embedding = Column(Vector(384)) if Vector else Column(Text)

    chunk_index = Column(Integer)

    metadata_json = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ==============================
# Email Conversation Threads
# ==============================

class ConversationThread(Base):
    __tablename__ = "conversation_threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True
    )

    thread_id = Column(String(255), index=True)

    sender_email = Column(String(255))
    subject = Column(Text)

    conversation_summary = Column(Text)

    last_category = Column(String(50))
    last_priority = Column(String(20))

    status = Column(String(20), default="open")

    last_message_id = Column(String(255))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ==============================
# MCP AI Decision Logs
# ==============================

class MCPDecision(Base):
    __tablename__ = "mcp_decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True
    )

    message_id = Column(String(255), index=True)
    thread_id = Column(String(255), index=True)

    category = Column(String(50))
    priority = Column(String(20))

    confidence = Column(Float)

    entities_json = Column(Text)

    summary = Column(Text)

    suggested_reply = Column(Text)

    requires_user_permission = Column(Boolean, default=False)

    user_action = Column(String(20))  # pending / approved / rejected

    executed_actions_json = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ==============================
# Email Storage
# ==============================

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

class EmailState(Base):
    __tablename__ = "email_states"

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        primary_key=True
    )

    last_email_id = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())