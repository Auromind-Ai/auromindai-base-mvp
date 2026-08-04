import uuid
from sqlalchemy import UUID, Column, ForeignKey, Integer, Numeric, String, DateTime, Text, func
from app.database import Base
from app.core.enums import InvoiceStatus
from sqlalchemy import Enum

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"))
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True)

    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id", ondelete="SET NULL"), nullable=True)
    flow_pack_purchase_id = Column(UUID(as_uuid=True), ForeignKey("flow_pack_purchases.id", ondelete="SET NULL"), nullable=True)
    wcc_recharge_log_id = Column(UUID(as_uuid=True), ForeignKey("wcc_recharge_logs.id", ondelete="SET NULL"), nullable=True)

    amount = Column(Numeric(12, 2), nullable=False) # Changed to Numeric for Decimal support
    currency = Column(String(3), default="INR")

    status = Column(Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.draft)

    razorpay_invoice_id = Column(String, unique=True, index=True)

    # GST compliance fields
    invoice_number = Column(String, unique=True, index=True, nullable=True)
    invoice_type = Column(String(50), default="tax_invoice")  # tax_invoice, credit_note, debit_note, refund_invoice
    product_type = Column(String(50), default="subscription")  # subscription, ai_credits, flow_packs, wcc_recharge

    subtotal = Column(Numeric(12, 2), nullable=True)
    gst_rate = Column(Numeric(5, 2), nullable=True)
    gst_amount = Column(Numeric(12, 2), nullable=True)
    cgst = Column(Numeric(12, 2), nullable=True)
    sgst = Column(Numeric(12, 2), nullable=True)
    igst = Column(Numeric(12, 2), nullable=True)
    taxable_amount = Column(Numeric(12, 2), nullable=True)
    total_amount = Column(Numeric(12, 2), nullable=True)
    place_of_supply = Column(String(100), nullable=True)

    # Supplier Snapshot
    supplier_name = Column(String(255), nullable=True)
    supplier_gstin = Column(String(50), nullable=True)
    supplier_address = Column(Text, nullable=True)
    supplier_state = Column(String(100), nullable=True)
    supplier_country = Column(String(100), nullable=True)

    # Customer Snapshot
    customer_name = Column(String(255), nullable=True)
    customer_gstin = Column(String(50), nullable=True)
    customer_address = Column(Text, nullable=True)
    customer_state = Column(String(100), nullable=True)
    customer_country = Column(String(100), nullable=True)

    issued_at = Column(DateTime(timezone=True))
    paid_at = Column(DateTime(timezone=True))

    pdf_url = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())