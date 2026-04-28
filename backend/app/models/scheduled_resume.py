import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class ScheduledResume(Base):
    """DB-backed delay for flow nodes with long waits (>30 min).

    Short delays (<30 min) still use Celery countdown (fast, in-memory).
    Long delays are persisted here so they survive Redis/Celery restarts.

    A Celery beat task polls this table every 30 seconds and fires
    ``resume_flow_node`` for any rows whose ``run_at`` has passed.
    """

    __tablename__ = "scheduled_resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    node_id = Column(String, nullable=False)
    inbound_text = Column(String, nullable=False, default="")
    msg_sequence_val = Column(Integer, nullable=False, default=0)
    flow_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    run_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        String(16), nullable=False, default="pending", index=True
    )  # pending | executed | cancelled
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_scheduled_resumes_pending_run_at", "status", "run_at"),
    )
