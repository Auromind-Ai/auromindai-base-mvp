from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, UniqueConstraint, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name = Column(String(255), nullable=False)

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    billing_owner_id = Column(
    UUID(as_uuid=True),
    ForeignKey("users.id", ondelete="SET NULL"),
    nullable=True
)
    provider_customer_id = Column(String, index=True, nullable=True)

    custom_token_limit = Column(Integer)

    plan_type = Column(String(50), default="starter")
    overage_enabled = Column(Boolean, default=False, nullable=False)

    #META WHATSAPP FIELDS
    meta_access_token = Column(Text, nullable=True)
    meta_business_id = Column(String(255), nullable=True)
    meta_waba_id = Column(String(255), nullable=True)
    meta_phone_number_id = Column(String(255), nullable=True)
    meta_display_phone = Column(String(50), nullable=True)
    meta_ig_id = Column(String(255), nullable=True)

    # OPTIONAL (FUTURE SAFE)
    meta_token_expiry = Column(DateTime(timezone=True), nullable=True)

    twilio_account_sid = Column(Text, nullable=True)
    twilio_auth_token = Column(Text, nullable=True)
    twilio_phone_number = Column(String(50), nullable=True)
    twilio_messaging_service_sid = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # RELATIONSHIPS
    ai_actions = relationship("AIAction", back_populates="workspace")

    conversations = relationship("Conversation", back_populates="workspace")

    members = relationship("WorkspaceMember", backref="workspace", cascade="all, delete-orphan")
    subscription = relationship("Subscription", backref="workspace")
    flow_pack_purchases = relationship("FlowPackPurchase", backref="workspace", cascade="all, delete-orphan")

class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True
    )

    role = Column(String(50), default="team_member")
    # founder / team_member

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),
    )
