from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class LeadFilters(BaseModel):
    model_config = ConfigDict(extra="forbid")
    search: str | None = Field(None, max_length=255)
    sources: list[str] = Field(default_factory=list, max_length=30)
    statuses: list[str] = Field(default_factory=list, max_length=30)
    tiers: list[Literal["hot", "warm", "cold"]] = Field(default_factory=list)
    min_score: int | None = Field(None, ge=0, le=100)
    max_score: int | None = Field(None, ge=0, le=100)
    created_from: datetime | None = None
    created_to: datetime | None = None
    activity_from: datetime | None = None
    activity_to: datetime | None = None
    converted_from: datetime | None = None
    converted_to: datetime | None = None
    score_changed: Literal["increased", "decreased", "unchanged"] | None = None
    intents: list[str] = Field(default_factory=list, max_length=30)
    assignment: Literal["mine", "unassigned", "assigned"] | None = None
    assigned_to: UUID | None = None
    labels: list[str] = Field(default_factory=list, max_length=20)
    converted: bool | None = None
    favorite: bool | None = None
    follow_up: bool | None = None
    min_value: float | None = Field(None, ge=0, allow_inf_nan=False)
    max_value: float | None = Field(None, ge=0, allow_inf_nan=False)
    product: str | None = Field(None, max_length=255)
    has_phone: bool | None = None
    has_email: bool | None = None
    unread: bool | None = None
    waiting: Literal["customer", "agent"] | None = None
    min_messages: int | None = Field(None, ge=0)
    max_messages: int | None = Field(None, ge=0)

    @model_validator(mode="after")
    def validate_ranges(self):
        for prefix in ("created", "activity", "converted"):
            for suffix in ("from", "to"):
                key = f"{prefix}_{suffix}"
                value = getattr(self, key)
                if value is not None and value.tzinfo is None:
                    setattr(self, key, value.replace(tzinfo=timezone.utc))
        for lower, upper in (("min_score", "max_score"), ("min_value", "max_value"),
                             ("min_messages", "max_messages"), ("created_from", "created_to"),
                             ("activity_from", "activity_to"), ("converted_from", "converted_to")):
            a, b = getattr(self, lower), getattr(self, upper)
            if a is not None and b is not None and a > b:
                raise ValueError(f"{lower} must not exceed {upper}")
        return self


class LeadFollowUpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    selected_ids: list[UUID] = Field(min_length=1, max_length=5000)


class LeadExportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scope: Literal["all", "filtered", "selected"] = "filtered"
    format: Literal["csv", "xlsx"] = "csv"
    filters: LeadFilters = Field(default_factory=LeadFilters)
    selected_ids: list[UUID] = Field(default_factory=list, max_length=5000)
    columns: list[str] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def selected_required(self):
        if self.scope == "selected" and not self.selected_ids:
            raise ValueError("Select at least one lead")
        return self


class CrmSavedViewCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(..., min_length=1, max_length=100)
    filters: LeadFilters | dict = Field(default_factory=dict)


class CrmSavedViewResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    name: str
    filters: dict
    created_at: datetime
    updated_at: datetime | None = None
