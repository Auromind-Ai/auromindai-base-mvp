from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base


class ImpersonationSession(Base):
    __tablename__ = "impersonation_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    session_id = Column(String, unique=True, nullable=False)

    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    used = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    expires_at = Column(DateTime(timezone=True))