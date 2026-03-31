import uuid
from sqlalchemy import JSON, UUID, Boolean, Column, Enum,Integer, Numeric, String, DateTime, func
from app.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name = Column(String, nullable=False)
    price =Column(Integer, nullable=False)

    version = Column(Integer, default=1) 

    message_limit = Column(Integer)
    token_limit = Column(Integer)

    price_per_extra_message = Column(Integer)
    price_per_extra_token = Column(Integer)

    workspace_limit = Column(Integer)

    billing_cycle = Column(Enum('monthly', 'yearly', name='billing_cycle_enum'), nullable=False)

    currency = Column(String(3), default='INR', nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)

    features = Column(JSON)

    trial_days = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())