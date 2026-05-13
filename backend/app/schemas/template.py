
from datetime import datetime

from pydantic import BaseModel, Field


class TemplateCreate(BaseModel):
    name: str
    type: str = "TEXT"
    message: str
    workspace_id: str | None = None
    category: str = "MARKETING"
    language: str = "en"


class TemplateRead(BaseModel):
    id: str
    workspace_id: str | None = None
    name: str
    type: str
    category: str | None = None
    language: str | None = None
    content: str
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
    phone: str
    template_name: str = Field(min_length=1)