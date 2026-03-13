from sqlalchemy import Column, Integer, Text, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base

class PaymentSettings(Base):
    __tablename__ = "payment_settings"

    id = Column(Integer, primary_key=True, index=True)
    razorpay_key = Column(Text)
    razorpay_secret = Column(Text)
    paypal_client = Column(Text)
    paypal_secret = Column(Text)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())