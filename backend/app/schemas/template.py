from __future__ import annotations
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, field_validator

class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=512, pattern=r"^[a-z0-9_]+$", description="Template name (lowercase letters, numbers, and underscores only)")
    type: str = Field(default="custom", max_length=50)
    message: str = Field(..., min_length=1, max_length=4096)
    workspace_id: str | None = None
    category: str = Field(..., min_length=1, max_length=50)
    language: str = Field(..., min_length=2, max_length=20)
    header: str | None = Field(None, max_length=1000)
    footer: str | None = Field(None, max_length=1000)
    cta: str | None = Field(None, max_length=2048)
    cta_btn_title: str | None = Field(None, max_length=255)

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v_str = v.strip()
        if not v_str:
            raise ValueError("Template message body cannot be empty.")
        return v_str


class TemplateRead(BaseModel):
    id: str
    workspace_id: str | None = None
    name: str
    type: str
    category: str | None = None
    language: str | None = None
    content: str
    header: str | None = None
    footer: str | None = None
    cta: str | None = None
    cta_btn_title: str | None = None
    status: str
    meta_template_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TemplateListResponse(BaseModel):
    templates: list[TemplateRead]


class TemplateStatusResponse(BaseModel):
    status: str
    template: TemplateRead | None = None


class TemplateSendRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20, pattern=r"^(?:\+?\d{1,3}[- ]?)?\d{10,14}$")
    template_name: str = Field(..., min_length=1, max_length=512)
    workspace_id: str | None = None
    variables: list[Any] = Field(default_factory=list, max_length=50)


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=5000)
    language: str | None = Field(None, max_length=50)
    tone: str | None = Field(None, max_length=50)

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        v_str = v.strip()
        if len(v_str) < 3:
            raise ValueError("Prompt must be at least 3 characters.")
        return v_str
