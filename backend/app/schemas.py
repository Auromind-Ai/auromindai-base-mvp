from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .models import ChannelType, SenderType, ConversationStatus

class MessageBase(BaseModel):
    content: str
    sender_type: SenderType = SenderType.USER

class MessageCreate(MessageBase):
    conversation_id: int

class Message(MessageBase):
    id: int
    conversation_id: int
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
    id: int
    status: ConversationStatus
    created_at: datetime
    messages: List[Message] = []

    class Config:
        from_attributes = True
