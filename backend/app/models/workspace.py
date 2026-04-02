from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
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

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    ai_actions = relationship("AIAction", back_populates="workspace")
    members = relationship("WorkspaceMember", backref="workspace", cascade="all, delete-orphan")
    subscription = relationship("Subscription", backref="workspace")

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
