from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid

class AutomationFlow(Base):
    __tablename__ = "automation_flows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), index=True) # Workspace ownership
    name = Column(String, index=True)
    trigger_type = Column(String)
    status = Column(String, default="Draft") # Draft, Active, Paused
    nodes = Column(JSON, default=list) # [{id, type, label, position, config}]
    edges = Column(JSON, default=list) # [{id, source, target}]
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
