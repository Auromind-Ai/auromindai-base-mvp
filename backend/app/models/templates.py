import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Template(Base):
    __tablename__ = "templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE")
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE")
    )

    name = Column(String, nullable=False)
    type = Column(String, default="TEXT")  # TEXT / IMAGE / VIDEO
    category = Column(String, default="MARKETING")  # MARKETING / UTILITY
    language = Column(String, default="en")

    content = Column(Text, nullable=False)  # main message body
    header = Column(String, nullable=True)
    footer = Column(String, nullable=True)
    cta = Column(String, nullable=True)
    cta_btn_title = Column(String, nullable=True)

    status = Column(String, default="draft")  
    # draft / pending / approved / rejected

    meta_template_id = Column(String, nullable=True)  # Meta API ID
    system_tag = Column(String, nullable=True)  # Trending, ecommerce, etc.

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    workspace = relationship("Workspace", backref="templates")
    user = relationship("User", backref="templates")