import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List
from sqlalchemy import Column, String, Boolean, DateTime, JSON, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


DEFAULT_SIGNALS: List[Dict[str, Any]] = []

DEFAULT_THRESHOLDS: Dict[str, int] = {
    "hot": 50,
    "warm": 30,
    "cold": 0,
}


class LeadScoringSetting(Base):
    __tablename__ = "lead_scoring_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    ai_qualification_enabled = Column(Boolean, default=True, nullable=False)
    thresholds = Column(JSON, default=lambda: DEFAULT_THRESHOLDS.copy(), nullable=False)
    signals = Column(JSON, default=list, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

