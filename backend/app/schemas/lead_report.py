"""Request validation for CRM email report settings and test delivery."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class LeadReportSettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    is_active: bool = False
    min_score: int = Field(50, ge=0, le=100)
    frequency: Literal["daily", "weekly", "monthly"] = "daily"
    send_time: str = "09:00"
    send_times: list[str] = Field(default_factory=lambda: ["09:00"], min_length=1, max_length=24)
    recipient_emails: list[EmailStr] = Field(default_factory=list, max_length=100)
    attach_csv: bool = True
    report_filters: dict = Field(default_factory=dict)
    csv_columns: list[str] | None = None
    subject_template: str | None = Field(None, max_length=255)
    body_template: str | None = Field(None, max_length=20000)

    @field_validator("send_time")
    @classmethod
    def validate_time(cls, value):
        for pattern in ("%H:%M", "%I:%M %p"):
            try:
                return datetime.strptime(value.strip().upper(), pattern).strftime("%H:%M")
            except ValueError:
                continue
        raise ValueError("Choose a valid report time")

    @field_validator("send_times")
    @classmethod
    def validate_times(cls, values):
        times = [cls.validate_time(value) for value in values]
        if len(times) != len(set(times)):
            raise ValueError("Choose different report times; duplicate times are not allowed")
        return sorted(times)


class LeadReportTestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recipient_emails: list[EmailStr] | None = Field(None, max_length=100)
    settings: LeadReportSettingsUpdate | None = None
