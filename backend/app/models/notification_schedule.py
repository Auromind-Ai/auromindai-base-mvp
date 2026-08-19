import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer, JSON, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class NotificationSchedule(Base):
    __tablename__ = "notification_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_name = Column(String(100), nullable=False, unique=True, index=True)
    display_name = Column(String(150), nullable=False)
    description = Column(String(255), nullable=True)

    # Schedule Configuration
    schedule_type = Column(String(50), nullable=False, default="daily") 
    time_of_day = Column(String(10), nullable=True, default="08:00") 
    day_of_week = Column(String(20), nullable=True, default="monday") 
    interval_minutes = Column(Integer, nullable=True)  
    default_timezone = Column(String(50), nullable=False, default="Asia/Kolkata")
    
    # State & Timings
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True, index=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    
    # Extra settings (e.g. per-workspace timezone toggle)
    config_json = Column(JSON, nullable=True, default=dict)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("event_name", name="uq_notification_schedule_event"),
    )
