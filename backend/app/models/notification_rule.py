import uuid
from sqlalchemy import Column, String, Boolean, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class NotificationRule(Base):
    __tablename__ = "notification_rules"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

   
    event_name = Column(String(100), nullable=False, index=True)

    
    template_key = Column(String(100), nullable=False, index=True)

    
    recipient_roles = Column(JSONB, nullable=False, default=list)

   
    channels = Column(JSONB, nullable=False, default=lambda: ["email"])

 
    conditions = Column(JSONB, nullable=True, default=dict)

   
    delay_minutes = Column(Integer, nullable=False, default=0)

    dedup_window_seconds = Column(Integer, nullable=False, default=86400)

    
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
