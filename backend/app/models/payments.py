from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid


class PaymentSettings(Base):
    __tablename__ = "payment_settings"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    razorpay_key    = Column(Text, nullable=True, default="")
    razorpay_secret = Column(Text, nullable=True, default="")
    paypal_client   = Column(Text, nullable=True, default="")
    paypal_secret   = Column(Text, nullable=True, default="")
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
    DateTime(timezone=True),
    server_default=func.now(),
    onupdate=func.now()
)