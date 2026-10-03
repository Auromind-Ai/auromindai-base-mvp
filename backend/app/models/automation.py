from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from typing import Optional, ClassVar


class AutomationFlow(Base):
    __tablename__ = "automation_flows"
    __allow_unmapped__ = True

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String, index=True)
    trigger_type = Column(String)
    status = Column(String, default="Draft")
    nodes = Column(JSON, default=list)
    edges = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    creator = relationship("User", foreign_keys=[created_by], lazy="joined")
    workspace = relationship("Workspace", foreign_keys=[workspace_id], lazy="joined")

    _fallback_email: ClassVar[Optional[str]] = None
    _fallback_name: ClassVar[Optional[str]] = None

    @property
    def created_by_email(self) -> Optional[str]:
        if self.creator and self.creator.email:
            return self.creator.email
        if hasattr(self, "_fallback_email") and self._fallback_email:
            return self._fallback_email
        return None

    @property
    def created_by_name(self) -> Optional[str]:
        if self.creator:
            return self.creator.full_name or self.creator.email
        if hasattr(self, "_fallback_name") and self._fallback_name:
            return self._fallback_name
        return None
