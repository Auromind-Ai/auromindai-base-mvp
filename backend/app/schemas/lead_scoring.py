
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator



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
    agent_label_bonus: int = 0


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
    is_favorite: bool = False
    labels: list[str] = Field(default_factory=list)



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
    is_favorite: bool = False
    labels: list[str] = Field(default_factory=list)




class ConvertLeadRequest(BaseModel):
    amount: float = Field(..., ge=0, description="Conversion monetary amount")
    product: str = Field(..., min_length=1, max_length=255)
    notes: Optional[str] = Field(None, max_length=5000)

    @field_validator("product")
    @classmethod
    def validate_product(cls, v: str) -> str:
        v_str = v.strip()
        if not v_str:
            raise ValueError("Product name cannot be empty.")
        return v_str


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
    phone: str = Field(..., min_length=10, max_length=20, pattern=r"^(?:\+?\d{1,3}[- ]?)?\d{10,14}$", description="Valid phone number")
    source: str = Field(default="manual", max_length=100)
    status: str = Field(default="new", max_length=50)
    budget_min: Optional[float] = Field(default=None, ge=0)
    budget_max: Optional[float] = Field(default=None, ge=0)
    note: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v_str = v.strip()
        if len(v_str) < 2:
            raise ValueError("Lead name must be at least 2 characters long.")
        return v_str

    @field_validator("budget_max")
    @classmethod
    def validate_budget_range(cls, v: Optional[float], info) -> Optional[float]:
        if v is not None:
            min_val = info.data.get("budget_min")
            if min_val is not None and v < min_val:
                raise ValueError("Maximum budget cannot be less than minimum budget.")
        return v


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


class UpdateLeadLabelsRequest(BaseModel):
    labels: list[str] = Field(..., max_length=20, description="List of labels to set on the lead")

    @field_validator("labels")
    @classmethod
    def validate_labels(cls, v: list[str]) -> list[str]:
        cleaned = []
        for label in v:
            lbl_str = label.strip()
            if lbl_str and len(lbl_str) <= 50:
                cleaned.append(lbl_str)
        return cleaned


class UpdateLeadLabelsResponse(BaseModel):
    lead_id: UUID
    labels: list[str]
    score: int
    behavioral_score: int
    semantic_intent_score: int
    lead_tier: str
    breakdown: ScoreBreakdown




class AssignLeadRequest(BaseModel):
    assigned_to: Optional[UUID] = None

