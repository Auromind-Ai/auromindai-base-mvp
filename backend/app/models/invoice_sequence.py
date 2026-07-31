from sqlalchemy import Column, String, Integer, DateTime, func
from app.database import Base

class InvoiceSequence(Base):
    __tablename__ = "invoice_sequences"

    prefix = Column(String(50), primary_key=True, default="AUR")
    year = Column(String(10), primary_key=True)  # e.g., "2026-27"
    current_value = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
