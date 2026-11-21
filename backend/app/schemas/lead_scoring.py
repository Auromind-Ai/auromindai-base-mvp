
from __future__ import annotations

from datetime import datetime
import re
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
    lead_tier: Optional[str] = None
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
    email: Optional[str] = None
    created_at: Optional[datetime] = None
    source: Optional[str] = None
    flow_name: Optional[str] = None
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
    updated_at: Optional[datetime] = None
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


def validate_and_normalize_phone(phone_input: str) -> str:
    """
    Validates and normalizes an international phone number according to country rules and E.164.
    Rejects:
    - Numbers exceeding max length (ITU-T E.164 max 15 digits)
    - Numbers with invalid country prefixes or wrong digit counts
    - Invalid characters
    """
    if not phone_input or not isinstance(phone_input, str):
        raise ValueError("Phone number is required.")

    cleaned = re.sub(r"[\s\-\(\)\.]", "", phone_input.strip())
    if not cleaned:
        raise ValueError("Phone number cannot be empty.")

    if not cleaned.startswith("+"):
        if re.match(r"^[6-9]\d{9}$", cleaned):
            cleaned = "+91" + cleaned
        elif re.match(r"^91[6-9]\d{9}$", cleaned):
            cleaned = "+" + cleaned
        elif re.match(r"^1[2-9]\d{9}$", cleaned):
            cleaned = "+" + cleaned
        else:
            cleaned = "+" + cleaned

    digits_only = cleaned[1:]
    if not digits_only.isdigit():
        raise ValueError("Phone number contains invalid non-numeric characters.")

    total_digits = len(digits_only)
    if total_digits < 7:
        raise ValueError("Phone number is too short. Minimum length is 7 digits.")
    if total_digits > 15:
        raise ValueError(f"Phone number exceeds the maximum allowed length of 15 digits (received {total_digits} digits).")

    if cleaned.startswith("+91"):
        national = cleaned[3:]
        if len(national) != 10:
            raise ValueError(f"Indian phone numbers (+91) must be exactly 10 digits (received {len(national)} digits).")
        if not re.match(r"^[6-9]\d{9}$", national):
            raise ValueError("Indian mobile numbers (+91) must start with 6, 7, 8, or 9.")
    elif cleaned.startswith("+1"):
        national = cleaned[2:]
        if len(national) != 10:
            raise ValueError(f"US/Canada phone numbers (+1) must be exactly 10 digits (received {len(national)} digits).")
        if not re.match(r"^[2-9]\d{9}$", national):
            raise ValueError("US/Canada phone numbers (+1) cannot start with 0 or 1.")
    elif cleaned.startswith("+44"):
        national = cleaned[3:]
        if len(national) not in (10, 11):
            raise ValueError(f"UK phone numbers (+44) must be 10 or 11 digits (received {len(national)} digits).")
        if not re.match(r"^[1-9]\d{8,10}$", national):
            raise ValueError("Invalid UK phone number format.")
    elif cleaned.startswith("+971"):
        national = cleaned[4:]
        if len(national) not in (8, 9):
            raise ValueError(f"UAE phone numbers (+971) must be 8 or 9 digits (received {len(national)} digits).")
        if not re.match(r"^[2-9]\d{7,8}$", national):
            raise ValueError("Invalid UAE phone number format.")
    elif cleaned.startswith("+65"):
        national = cleaned[3:]
        if len(national) != 8:
            raise ValueError(f"Singapore phone numbers (+65) must be exactly 8 digits (received {len(national)} digits).")
        if not re.match(r"^[3689]\d{7}$", national):
            raise ValueError("Singapore phone numbers (+65) must start with 3, 6, 8, or 9.")
    elif cleaned.startswith("+61"):
        national = cleaned[3:]
        if len(national) != 9:
            raise ValueError(f"Australian phone numbers (+61) must be 9 digits (received {len(national)} digits).")
        if not re.match(r"^[2-478]\d{8}$", national):
            raise ValueError("Invalid Australian phone number format.")
    elif cleaned.startswith("+49"):
        national = cleaned[3:]
        if len(national) not in (10, 11):
            raise ValueError(f"German phone numbers (+49) must be 10 or 11 digits (received {len(national)} digits).")
    elif cleaned.startswith("+966"):
        national = cleaned[4:]
        if len(national) != 9:
            raise ValueError(f"Saudi Arabia phone numbers (+966) must be 9 digits (received {len(national)} digits).")
        if not re.match(r"^5\d{8}$", national):
            raise ValueError("Saudi Arabia mobile numbers (+966) must start with 5.")
    else:
        if not re.match(r"^\+[1-9]\d{6,14}$", cleaned):
            raise ValueError("Invalid international phone number format. Must follow E.164 (+CountryCode followed by digits).")

    return cleaned


class ManualLeadCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., min_length=7, max_length=20, description="Valid international phone number")
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

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return validate_and_normalize_phone(v)

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


class LeadSignalItem(BaseModel):
    id: str
    name: str
    example_message: Optional[str] = ""
    examples: list[str] = Field(default_factory=list)
    points: int
    enabled: bool = True
    icon: Optional[str] = "zap"
    is_custom: bool = False


class LeadScoringSettingSchema(BaseModel):
    id: Optional[UUID] = None
    workspace_id: Optional[UUID] = None
    ai_qualification_enabled: bool = True
    thresholds: dict[str, int] = Field(default_factory=lambda: {"hot": 50, "warm": 30, "cold": 0})
    signals: list[LeadSignalItem] = Field(default_factory=list)
    updated_at: Optional[datetime] = None


class LeadScoringSettingUpdateRequest(BaseModel):
    ai_qualification_enabled: Optional[bool] = None
    thresholds: Optional[dict[str, int]] = None
    signals: Optional[list[LeadSignalItem]] = None

