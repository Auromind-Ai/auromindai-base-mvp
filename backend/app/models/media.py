from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid


class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    file_path = Column(String(500), nullable=False)  # Relative path like "images/uuid.jpg"

    file_type = Column(String(50), nullable=False)  # "image", "video", "document"

    original_filename = Column(String(255), nullable=False)

    file_size = Column(Integer, nullable=False)  # in bytes

    mime_type = Column(String(100), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(DateTime(timezone=True), onupdate=func.now())