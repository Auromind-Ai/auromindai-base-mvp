from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class ChatSessionCreate(BaseModel):
    title: Optional[str] = Field("New Chat", max_length=255)
    workspace_id: str

class ChatSessionResponse(BaseModel):
    id: UUID
    title: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    workspace_id: UUID

    class Config:
        from_attributes = True

class ChatMessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime
    status: Optional[str] = 'COMPLETED'

    class Config:
        from_attributes = True

class UpdateSessionRequest(BaseModel):
    title: str = Field(..., max_length=255)

class ChatStreamRequest(BaseModel):
    message: str = Field(..., max_length=96000, description="Input message prompt limited to maximum 96000 characters to prevent oversized prompts, excessive token usage, and database bloat.")
    session_id: Optional[str] = None
    use_rag: bool = True
    model: str = "auto"
    document_id: Optional[str] = None
    chat_mode: str = "auto"
    source: str = "internal"

class ChatQueryRequest(BaseModel):
    message: str = Field(..., max_length=96000, description="Input query message limited to maximum 96000 characters to prevent oversized prompts, excessive token usage, and database bloat.")
    workspace_id: str
