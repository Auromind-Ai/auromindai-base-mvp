from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"
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

    class Config:
        from_attributes = True

class UpdateSessionRequest(BaseModel):
    title: str

class ChatStreamRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    use_rag: bool = True
    model: str = "auto"
    document_id: Optional[str] = None
    chat_mode: str = "auto"
    source: str = "internal"

class ChatQueryRequest(BaseModel):
    message: str
    workspace_id: str
