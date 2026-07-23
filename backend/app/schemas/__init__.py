from .auth import EmailLoginRequest, UserResponse, WorkspaceResponse, SecretLoginRequest, SendOTPRequest, VerifyOTPRequest
from .automation import FlowPromptRequest, FlowSaveRequest, FlowResponseModel, StatusResponse, DeleteFlowResponse, ApproveResponse, GenerateFlowResponse
from .brain import IngestTextRequest, IngestURLRequest, SearchRequest, QueryRequest, BrainEntryResponse, SearchResultItem, SearchResponse, SourceItem, QueryResponse, BrainStatsResponse, IngestionStatusResponse, ListEntriesResponse, CrawlWebsiteRequest, IngestResponse, CrawlResponse
from .chat import ChatSessionCreate, ChatSessionResponse, ChatMessageResponse, UpdateSessionRequest, ChatStreamRequest, ChatQueryRequest
from .dashboard import MetricResponse, AttentionItemResponse, AIInsightResponse, FlowStatResponse, ScheduleItemResponse
from .email import EmailItem, InboxResponse, SendReplyResponse
from .feedback import FeedbackRequest
from .template import TemplateCreate, TemplateListResponse, TemplateRead, TemplateSendRequest, TemplateStatusResponse, GenerateRequest
from .upload import UploadResponse
from .admin import ModelConfigCreate, ModelConfigUpdate, AdminAuthRequest
from .webhook import SendReply, AISuggest, TwilioConnectRequest
from .preferences import PreferencesUpdate
from .security import SessionResponse, SecuritySummaryResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models import ChannelType, SenderType, ConversationStatus

class MessageBase(BaseModel):
    content: str
    sender_type: SenderType = SenderType.USER

class MessageCreate(MessageBase):
    conversation_id: str

class Message(MessageBase):
    id: UUID
    conversation_id: UUID
    timestamp: datetime
    is_read: bool

    class Config:
        from_attributes = True

class ConversationBase(BaseModel):
    contact_name: str | None = None
    channel: ChannelType
    external_id: str | None = None

class ConversationCreate(ConversationBase):
    pass

class Conversation(ConversationBase):
    id: UUID
    status: ConversationStatus
    created_at: datetime
    last_message_at: Optional[datetime] = None
    message_count: int = 0
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

class CreateSubscriptionRequest(BaseModel):
    workspace_id: str
    plan: str
    provider: str = "razorpay"


class VerifyPaymentRequest(BaseModel):
    workspace_id: str
    plan: str
    provider: str = "razorpay"
    payment_id: str | None = None
    subscription_id: str | None = None
    signature: str | None = None


class LegacyCreateOrderRequest(BaseModel):
    workspace_id: str
    amount: int


class LegacyUpgradePlanRequest(BaseModel):
    workspace_id: str
    plan: str


from .plan_entitlement import PlanEntitlementBase, PlanEntitlementCreate, PlanEntitlementUpdate, PlanEntitlementResponse, EntitlementCheckRequest, EntitlementCheckResponse
from .feature_billing_rule import FeatureBillingRuleBase, FeatureBillingRuleCreate, FeatureBillingRuleUpdate, FeatureBillingRuleResponse
from . import lead_scoring


