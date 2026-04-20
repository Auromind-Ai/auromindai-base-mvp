import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class FlowExecutionState(Base):
    __tablename__ = "flow_execution_states"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    active_flow_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    current_node_id = Column(String, nullable=True)
    # Immutable conversation metadata (never changes)
    conversation_metadata = Column(JSONB, default=dict)
    runtime_context = Column(MutableDict.as_mutable(JSONB), default=dict)
    # Legacy: keep for migration
    context = Column(JSONB, nullable=False, default=dict)
    pending_button = Column(JSONB, nullable=True)
    button_expires_at = Column(DateTime(timezone=True), nullable=True)
    pending_question = Column(JSONB, nullable=True)
    question_expires_at = Column(DateTime(timezone=True), nullable=True)
    loop_count = Column(Integer, default=0)
    last_node_id = Column(String, nullable=True)
    # Pagination cursor for conversation history
    last_context_checkpoint_id = Column(UUID, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    conversation = relationship("Conversation", back_populates="execution_state")
    __table_args__ = (
        UniqueConstraint("conversation_id", name="uq_flow_execution_state_conversation"),
)

class FlowExecutionTrace(Base):
    __tablename__ = "flow_execution_traces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    flow_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    node_id = Column(String, nullable=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="success", index=True)
    duration_ms = Column(Integer, nullable=True)
    tokens_in = Column(Integer, nullable=True)
    tokens_out = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    cost = Column(Numeric(12, 6), nullable=True)
    metadata_json = Column(JSONB, nullable=False, default=dict)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    conversation = relationship("Conversation", back_populates="execution_traces")

