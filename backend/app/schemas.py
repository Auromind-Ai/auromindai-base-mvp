from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from .models import ChannelType, SenderType, ConversationStatus


class MessageBase(BaseModel):
    content: str
    sender_type: SenderType = SenderType.USER


class MessageCreate(MessageBase):
    conversation_id: UUID


class Message(MessageBase):
    id: UUID
    conversation_id: UUID
    timestamp: datetime
    is_read: bool

    class Config:
        from_attributes = True


class ConversationBase(BaseModel):
    contact_name: str
    channel: ChannelType
    external_id: str


class ConversationCreate(ConversationBase):
    pass


class Conversation(ConversationBase):
    id: UUID
    status: ConversationStatus
    created_at: datetime
    messages: List[Message] = []

    class Config:
        from_attributes = True


class FollowupBase(BaseModel):
    scheduled_at: datetime
    message_content: Optional[str] = None
    status: Optional[str] = "pending"


class FollowupCreate(FollowupBase):
    conversation_id: UUID


class FollowupUpdate(BaseModel):
    status: Optional[str] = None
    message_content: Optional[str] = None


class Followup(FollowupBase):
    id: UUID
    conversation_id: UUID
    followup_count: int
    mcp_decision: Optional[str] = None
    mcp_reason: Optional[str] = None
    created_at: datetime
    executed_at: datetime

    class Config:
        from_attributes = True