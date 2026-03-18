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

class SendReply(BaseModel):
    conversation_id: str
    phone: str
    message: str


class AISuggest(BaseModel):
    conversation_id: str
    workspace_id: str
    message: str

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

class FollowupBase(BaseModel):
    scheduled_at: datetime
    message_content: Optional[str] = None
    status: Optional[str] = "pending"

class FollowupCreate(FollowupBase):
    conversation_id: str

class FollowupUpdate(BaseModel):
    status: Optional[str] = None
    message_content: Optional[str] = None

class Followup(FollowupBase):
    id: str
    conversation_id: str
    followup_count: int
    mcp_decision: Optional[str] = None
    mcp_reason: Optional[str] = None
    created_at: datetime
    executed_at: datetime

    class Config:
        from_attributes = True


class PaymentSettings(BaseModel):
    razorpay_key: str
    razorpay_secret: str
    paypal_client: str
    paypal_secret: str

class PaymentSettingsResponse(BaseModel):
    razorpay_key:   str = ""
    razorpay_secret: str = ""
    paypal_client:  str = ""
    paypal_secret:  str = ""

    class Config:
        from_attributes = True