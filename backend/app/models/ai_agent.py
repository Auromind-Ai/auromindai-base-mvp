from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class AIAgent(Base):
    __tablename__ = "ai_agents"
    __allow_unmapped__ = True

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Basic Info
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    agent_type = Column(String(100), default="sales_assistant", nullable=False)
    avatar_url = Column(String(500), nullable=True)
    language = Column(String(100), default="English (India)", nullable=False)
    tone_of_voice = Column(String(100), default="Friendly & Professional", nullable=False)
    business_name = Column(String(255), nullable=True)
    website_url = Column(String(500), nullable=True)

    # Status: active | paused | draft
    status = Column(String(50), default="active", nullable=False, index=True)
    is_draft = Column(Boolean, default=False, nullable=False, index=True)

    # Channel Configurations
    # e.g. {"whatsapp": {"enabled": true}, "instagram": {"enabled": true}, "website": {"enabled": true}}
    channels_config = Column(JSON, default=dict, nullable=False)

    # Channel Settings
    # e.g. {"auto_reply": true, "sync_crm": true, "channel_specific_tone": true}
    channel_settings = Column(JSON, default=dict, nullable=False)

    # AI Model Configuration
    # e.g. {"provider": "openai", "model": "gpt-4o", "temperature": 0.7, "max_tokens": 1024, ...}
    ai_config = Column(JSON, default=dict, nullable=False)

    # Knowledge Base Configuration
    # e.g. {"files": [...], "website_urls": [...], "faqs": [...], "integrations": [...], "settings": {...}}
    knowledge_config = Column(JSON, default=dict, nullable=False)

    # Metadata / Statistics
    conversations_count = Column(JSON, default=dict, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    workspace = relationship("Workspace", foreign_keys=[workspace_id], lazy="joined")
    creator = relationship("User", foreign_keys=[created_by], lazy="joined")

    def to_dict(self):
        return {
            "id": str(self.id),
            "workspace_id": str(self.workspace_id) if self.workspace_id else None,
            "created_by": str(self.created_by) if self.created_by else None,
            "name": self.name,
            "description": self.description,
            "agent_type": self.agent_type,
            "avatar_url": self.avatar_url,
            "language": self.language,
            "tone_of_voice": self.tone_of_voice,
            "business_name": self.business_name,
            "website_url": self.website_url,
            "status": self.status,
            "is_draft": self.is_draft,
            "channels_config": self.channels_config or {},
            "channel_settings": self.channel_settings or {},
            "ai_config": self.ai_config or {},
            "knowledge_config": self.knowledge_config or {},
            "conversations_count": self.conversations_count or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
