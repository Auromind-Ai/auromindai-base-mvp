from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.sql import func
from app.database import Base
import uuid

# Note: This assumes pgvector extension is installed
# CREATE EXTENSION vector;
try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    # Fallback if pgvector not installed yet
    Vector = None

class BrainEntry(Base):
    __tablename__ = "brain_entries"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"))
    title = Column(String(255))
    content = Column(Text, nullable=False)
    content_type = Column(String(50))  # text, pdf
    # Embedding vector - 1536 dimensions for OpenAI embeddings
    # embedding = Column(Vector(1536)) if Vector else Column(Text)
    # Embedding vector - 1536 dimensions for OpenAI embeddings (768 for Gemini/Llama)
    embedding = Column(Vector(768)) # Using 768 for Gemini/Llama3
    # embedding = Column(Text)  # Fallback removed
    version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Async Processing Status
    status = Column(String(20), default="completed")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
