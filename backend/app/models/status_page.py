import uuid
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Float,
    DateTime,
    Text,
    JSON,
    ForeignKey,
    UniqueConstraint,
    func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class ServiceHealthCheck(Base):
    __tablename__ = "service_health_checks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_key = Column(String(50), nullable=False, index=True)
    service_name = Column(String(100), nullable=False)
    is_healthy = Column(Boolean, nullable=False, default=True)
    status_code = Column(Integer, nullable=True)
    response_time_ms = Column(Float, nullable=False, default=0.0)
    error_message = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)
    checked_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class ServiceDailyUptime(Base):
    __tablename__ = "service_daily_uptimes"
    __table_args__ = (
        UniqueConstraint("service_key", "date", name="uq_service_daily_uptime_key_date"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_key = Column(String(50), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    total_checks = Column(Integer, nullable=False, default=0)
    successful_checks = Column(Integer, nullable=False, default=0)
    uptime_percentage = Column(Float, nullable=False, default=100.0)
    avg_response_time_ms = Column(Float, nullable=False, default=0.0)
    has_incident = Column(Boolean, nullable=False, default=False)
    incident_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_key = Column(String(50), nullable=False, index=True)
    service_name = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=False, default="major")  # minor, major, critical, maintenance
    status = Column(String(20), nullable=False, default="investigating")  # investigating, identified, monitoring, resolved
    description = Column(Text, nullable=False)
    start_time = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    resolved_time = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    is_auto_detected = Column(Boolean, nullable=False, default=False)
    is_maintenance = Column(Boolean, nullable=False, default=False)
    scheduled_start = Column(DateTime(timezone=True), nullable=True)
    scheduled_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    updates = relationship(
        "IncidentUpdate",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="desc(IncidentUpdate.created_at)"
    )


class IncidentUpdate(Base):
    __tablename__ = "incident_updates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), nullable=False)  # investigating, identified, monitoring, resolved
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    incident = relationship("Incident", back_populates="updates")


class StatusSubscriber(Base):
    __tablename__ = "status_subscribers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StatusPageConfig(Base):
    __tablename__ = "status_page_config"

    id = Column(Integer, primary_key=True, default=1)
    failure_threshold = Column(Integer, nullable=False, default=3)
    recovery_threshold = Column(Integer, nullable=False, default=2)
    check_interval_seconds = Column(Integer, nullable=False, default=60)
    timeout_seconds = Column(Integer, nullable=False, default=10)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
