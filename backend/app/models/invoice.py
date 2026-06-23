import uuid
from sqlalchemy import  UUID, Column, ForeignKey, Integer, String, DateTime,Text, func
from app.database import Base
from app.core.enums import InvoiceStatus
from sqlalchemy import Enum

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"))
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"))

    amount = Column(Integer, nullable=False)
    currency = Column(String(3), default="INR")

    status = Column(Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.draft)

    razorpay_invoice_id = Column(String, unique=True, index=True)

    issued_at = Column(DateTime(timezone=True))
    paid_at = Column(DateTime(timezone=True))

    pdf_url = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())