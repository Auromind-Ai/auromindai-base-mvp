
import uuid

from sqlalchemy import (Column,DateTime,Float,ForeignKey,Integer,String,Text,)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class LeadScoreHistory(Base):

    __tablename__ = "lead_score_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    lead_id = Column(
        UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    score_before = Column(Integer, nullable=False, default=0)
    score_after = Column(Integer, nullable=False, default=0)
    behavioral_score_delta = Column(Integer, nullable=False, default=0)
    intent_score_delta = Column(Integer, nullable=False, default=0)

    # Human-readable reason: "flow_progress", "recency_decay",
    # "template_replied", "manual_recalc", etc.
    reason = Column(String(255), nullable=False, default="recalculation")
    event_type = Column(String(100), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )


class TemplateLog(Base):
   

    __tablename__ = "template_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    lead_id = Column(
        UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    template_id = Column(
        UUID(as_uuid=True),
        ForeignKey("templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    sent_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # replied | clicked | ignored | read | delivered | sent
    response_type = Column(String(50), nullable=True)

    # Points awarded / deducted when this event was processed
    score_impact = Column(Integer, nullable=True, default=0)
