from pydantic import BaseModel, Field, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime

class ChatSessionCreate(BaseModel):
    title: Optional[str] = Field(default="New Chat", min_length=1, max_length=255)
    workspace_id: Optional[str] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_str = v.strip()
            if not v_str:
                raise ValueError("Session title cannot be empty or whitespace only.")
            return v_str
        return "New Chat"

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
    title: str = Field(..., min_length=1, max_length=255)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v_str = v.strip()
        if not v_str:
            raise ValueError("Session title cannot be empty or whitespace only.")
        return v_str

class StopChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128)

class ChatStreamRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=96000, description="Input message prompt limited to maximum 96000 characters to prevent oversized prompts, excessive token usage, and database bloat.")
    session_id: Optional[str] = None
    use_rag: bool = True
    model: str = "auto"
    document_id: Optional[str] = None
    chat_mode: str = "auto"
    source: str = "internal"

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Message prompt cannot be empty or blank.")
        return v

class ChatQueryRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=96000, description="Input query message limited to maximum 96000 characters to prevent oversized prompts, excessive token usage, and database bloat.")
    workspace_id: Optional[str] = None

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Message query cannot be empty or blank.")
        return v

