from .auth import EmailLoginRequest, UserResponse, WorkspaceResponse, SendOTPRequest, VerifyOTPRequest
from .automation import FlowPromptRequest, FlowSaveRequest, FlowResponseModel, StatusResponse, DeleteFlowResponse, ApproveResponse, GenerateFlowResponse
from .brain import IngestTextRequest, IngestURLRequest, SearchRequest, QueryRequest, BrainEntryResponse, SearchResultItem, SearchResponse, SourceItem, QueryResponse, BrainStatsResponse, IngestionStatusResponse, ListEntriesResponse, CrawlWebsiteRequest, IngestResponse, CrawlResponse
from .chat import ChatSessionCreate, ChatSessionResponse, ChatMessageResponse, UpdateSessionRequest, ChatStreamRequest, ChatQueryRequest, StopChatRequest
from .dashboard import MetricResponse, AttentionItemResponse, AIInsightResponse, FlowStatResponse, ScheduleItemResponse
from .email import EmailItem, InboxResponse, SendReplyResponse, SendEmailReplyRequest
from .feedback import FeedbackRequest
from .template import TemplateCreate, TemplateListResponse, TemplateRead, TemplateSendRequest, TemplateStatusResponse, GenerateRequest
from .upload import UploadResponse
from .admin import ModelConfigCreate, ModelConfigUpdate, AdminAuthRequest
from .webhook import SendReply, AISuggest, TwilioConnectRequest, MetaWhatsAppConnectRequest, InstagramConnectRequest
from .preferences import PreferencesUpdate
from .security import SessionResponse, SecuritySummaryResponse

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models import ChannelType, SenderType, ConversationStatus

class MessageBase(BaseModel):
    content: Optional[str] = Field(None, max_length=50000)
    sender_type: SenderType = SenderType.USER
    media_url: Optional[str] = Field(None, max_length=2048)
    media_type: Optional[str] = Field(None, max_length=50)
    mime_type: Optional[str] = Field(None, max_length=100)

class MessageCreate(MessageBase):
    conversation_id: str = Field(..., min_length=1, max_length=128)

class Message(MessageBase):
    id: UUID | str
    conversation_id: UUID | str
    timestamp: datetime
    is_read: bool
    status: Optional[str] = None
    source: Optional[str] = None
    external_id: Optional[str] = None

    class Config:
        from_attributes = True

class ConversationBase(BaseModel):
    contact_name: Optional[str] = Field(None, max_length=255)
    channel: ChannelType
    external_id: Optional[str] = Field(None, max_length=255)

class ConversationCreate(ConversationBase):
    pass

class Conversation(ConversationBase):
    id: UUID
    status: ConversationStatus
    created_at: datetime
    last_message_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    message_count: int = 0
    messages: List[Message] = []

    class Config:
        from_attributes = True

class FollowupBase(BaseModel):
    scheduled_at: datetime
    message_content: Optional[str] = Field(None, max_length=10000)
    status: Optional[str] = Field(default="pending", max_length=50)

class FollowupCreate(FollowupBase):
    conversation_id: str = Field(..., min_length=1, max_length=128)

class FollowupUpdate(BaseModel):
    status: Optional[str] = Field(None, max_length=50)
    message_content: Optional[str] = Field(None, max_length=10000)


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


from .billing import (
    CreditsPurchaseRequest,
    CreditsVerifyRequest,
    UnifiedBillingItem,
    UnifiedBillingResponse,
    UpdateBillingProfileRequest,
    CreateSubscriptionRequest,
    VerifyPaymentRequest,
    ReportPaymentFailureRequest,
    LegacyCreateOrderRequest,
    LegacyUpgradePlanRequest,
    PlanPurchaseRequest,
    PlanVerifyRequest,
    RetryPaymentOpRequest,
    ReplayWebhookOpRequest,
    ManualVerifyPaymentOpRequest,
    RetryRechargeOpRequest,
    RetryCreditPurchaseOpRequest,
    RepairBillingOpRequest,
)
from .plan_entitlement import PlanEntitlementBase, PlanEntitlementCreate, PlanEntitlementUpdate, PlanEntitlementResponse, EntitlementCheckRequest, EntitlementCheckResponse
from .feature_billing_rule import FeatureBillingRuleBase, FeatureBillingRuleCreate, FeatureBillingRuleUpdate, FeatureBillingRuleResponse
from .plan import PlanBase, PlanCreate, PlanUpdate, PlanResponse, PlanPublicItem
from . import lead_scoring


