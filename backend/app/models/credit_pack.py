import uuid
from sqlalchemy import Column, String, Numeric, Integer, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class CreditPack(Base):
    __tablename__ = "credit_packs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pack_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    credits = Column(Integer, nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
