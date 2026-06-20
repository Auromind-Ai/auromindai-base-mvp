import uuid
from sqlalchemy import Column, Integer, Numeric, DateTime, String, Boolean, Text, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class FeatureBillingRule(Base):
    __tablename__ = "feature_billing_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    feature_key = Column(String(100), nullable=False, unique=True, index=True)
    feature_name = Column(String(255), nullable=False)

    billing_type = Column(String(50), nullable=False)  # TOKEN | FLAT | PER_MB | PER_MINUTE | PER_REQUEST
    unit_value = Column(Integer, nullable=False, default=1)
    credit_cost = Column(Numeric(10, 4), nullable=False, default=0.0000)

    is_active = Column(Boolean, nullable=False, default=True)
    description = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
