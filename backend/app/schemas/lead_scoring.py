
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field



# Score calculation (standalone / preview)


class ScoreCalculateRequest(BaseModel):
    current_node: int = Field(..., ge=0, description="Current flow node (1-indexed)")
    total_nodes: int = Field(..., ge=0, description="Total flow nodes")
    days_inactive: int = Field(..., ge=0, description="Calendar days since last activity")
    template_responses: list[str] = Field(
        default_factory=list,
        description="List of response types: 'replied', 'clicked', 'ignored'",
    )
    semantic_intent_score: int = Field(
        default=0,
        ge=-50,
        le=100,
        description="Semantic intent score from inbound message signals",
    )


class MessageIntentRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)

class MessageIntentResponse(BaseModel):
    lead_id: UUID
    message_length: int
    skipped: bool

    signals: dict[str, Any]

    semantic_intent_score: int
    behavioral_score: int
    lead_tier: str

    score: int
    breakdown: ScoreBreakdown

    previous_score: Optional[int] = None

class NodeProgressResponse(BaseModel):
    lead_id: UUID

    previous_node: int
    current_node: int
    total_nodes: int

    progress_percent: float

    score: int
    breakdown: ScoreBreakdown

    previous_score: Optional[int] = None


    
class NodeProgressRequest(BaseModel):
    current_node: int = Field(..., ge=0)
    total_nodes: int = Field(..., ge=1)
    node_name: str | None = Field(default=None, max_length=255)


class FactorDetail(BaseModel):
    score: int
    max: int


class ProgressDetail(FactorDetail):
    current_node: int
    total_nodes: int


class RecencyDetail(FactorDetail):
    days_inactive: int


class EngagementDetail(FactorDetail):
    positive_responses: int
    negative_responses: int


class IntentDetail(FactorDetail):
    signals: dict[str, Any]
    word_count: int


class ScoreBreakdown(BaseModel):
    total: int
    behavioral_score: int
    semantic_intent_score: int
    progress: ProgressDetail
    recency: RecencyDetail
    engagement: EngagementDetail
    intent: IntentDetail


class ScoreCalculateResponse(BaseModel):
    score: int
    breakdown: ScoreBreakdown



# Single-lead recalculate (DB write)


class LeadScoreResponse(BaseModel):
    lead_id: UUID
    name: Optional[str] = None
    score: int
    behavioral_score: int
    semantic_intent_score: int
    lead_tier: str
    breakdown: ScoreBreakdown
    previous_score: Optional[int] = None



# Bulk recalculate


class BulkRecalcItem(BaseModel):
    lead_id: UUID
    name: Optional[str] = None
    score: int
    behavioral_score: int
    semantic_intent_score: int
    lead_tier: str
    breakdown: ScoreBreakdown


class BulkRecalcResponse(BaseModel):
    recalculated: int
    items: list[BulkRecalcItem]



# Score history


class ScoreHistoryItem(BaseModel):
    id: UUID
    score_before: int
    score_after: int
    reason: str
    created_at: Optional[datetime] = None


class ScoreHistoryResponse(BaseModel):
    lead_id: UUID
    history: list[ScoreHistoryItem]



# Workspace leads listing (with scores)


class LeadScoreListItem(BaseModel):
    lead_id: UUID
    name: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    channel: Optional[str] = None
    status: Optional[str] = None
    score: int
    behavioral_score: int
    semantic_intent_score: int
    lead_tier: str
    breakdown: ScoreBreakdown
    current_node: Optional[int] = None
    total_nodes: Optional[int] = None
    last_activity_at: Optional[datetime] = None
    assigned_to: Optional[UUID] = None
    conversation_id: Optional[UUID] = None  # FIX 6
    is_converted: bool = False
    conversion_amount: Optional[float] = None
    converted_at: Optional[datetime] = None
    converted_product: Optional[str] = None
    conversion_notes: Optional[str] = None


class LeadScoreListResponse(BaseModel):
    total: int
    items: list[LeadScoreListItem]



# Lead detail (with conversation log)


class ConversationLogItem(BaseModel):
    id: UUID
    content: str
    direction: str  # inbound / outbound
    sent_at: datetime
    metadata: Optional[dict] = None


class LeadDetailResponse(BaseModel):
    lead_id: UUID
    name: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    channel: Optional[str] = None
    status: str
    score: int
    behavioral_score: int
    semantic_intent_score: int
    lead_tier: str
    breakdown: ScoreBreakdown
    conversation_id: Optional[UUID] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    intent_signals: Optional[dict] = None
    current_node: int
    total_nodes: int
    last_activity_at: Optional[datetime] = None
    assigned_to: Optional[UUID] = None
    created_at: datetime
    conversation_log: list[ConversationLogItem]
    avg_reply_minutes: Optional[float] = None
    is_converted: bool = False
    conversion_amount: Optional[float] = None
    converted_at: Optional[datetime] = None
    converted_product: Optional[str] = None
    conversion_notes: Optional[str] = None



class ConvertLeadRequest(BaseModel):
    amount: float
    product: str
    notes: Optional[str] = None


class ConvertLeadResponse(BaseModel):
    lead_id: UUID
    status: str
    conversion_amount: float
    converted_at: datetime
    is_converted: bool
    converted_product: Optional[str] = None
    conversion_notes: Optional[str] = None
    score: int
    behavioral_score: int
    semantic_intent_score: int
    lead_tier: str


class ManualLeadCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., description="Indian mobile format")
    source: str = Field(default="manual")
    status: str = Field(default="new")
    budget_min: Optional[float] = Field(default=None)
    budget_max: Optional[float] = Field(default=None)
    note: Optional[str] = Field(default=None)


class ManualLeadCreateResponse(BaseModel):
    lead_id: UUID
    name: str
    phone: str
    source: str
    status: str
    score: int
    behavioral_score: int
    semantic_intent_score: int
    lead_tier: str
    created_at: datetime


