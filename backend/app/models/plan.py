import uuid
from sqlalchemy import JSON, UUID, Boolean, Column, Enum, Float, Integer, Numeric, String, DateTime, func
from app.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name = Column(String, nullable=False, unique=True, index=True) 
    display_name = Column(String, nullable=True)
    
    price = Column(Float, nullable=False, default=0.0)
    monthly_price = Column(Float, nullable=False, default=0.0)
    yearly_price = Column(Float, nullable=False, default=0.0)

    version = Column(Integer, default=1) 

    description = Column(String, default="", nullable=True)
    message_limit = Column(Integer, nullable=True)
    token_limit = Column(Integer, nullable=True)

    price_per_extra_message = Column(Integer, nullable=True)
    price_per_extra_token = Column(Integer, nullable=True)

    workspace_limit = Column(Integer, default=1)
    display_order = Column(Integer, default=0, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)

    billing_cycle = Column(Enum('monthly', 'yearly', name='billing_cycle_enum'), default='monthly', nullable=False)

    currency = Column(String(3), default='INR', nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)

    features = Column(JSON)

    created_at = Column(DateTime(timezone=True), server_default=func.now())