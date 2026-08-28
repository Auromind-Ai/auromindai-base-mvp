from typing import Any, List, Optional
from pydantic import BaseModel, Field

class EmailItem(BaseModel):
    id: str
    thread_id: Optional[str] = None
    from_: Optional[str] = None
    subject: Optional[str] = None
    date: Optional[Any] = None
    priority: str = "unknown"
    category: str = "unknown"
    confidence: float = 0
    summary: str = "AI summary loading..."
    suggested_reply: Optional[str] = None
    actions: List[Any] = []

    class Config:
        populate_by_name = True

class InboxResponse(BaseModel):
    emails: List[dict]  

class SendReplyResponse(BaseModel):
    status: str

class SendEmailReplyRequest(BaseModel):
    thread_id: str = Field(..., min_length=1, max_length=255)
    reply_text: str = Field(..., min_length=1, max_length=50000)
    to_email: str = Field(..., min_length=3, max_length=255)
    message_id: Optional[str] = Field(None, max_length=255)
    subject: Optional[str] = Field(None, max_length=255)
    workspace_id: Optional[str] = None



class GmailSyncLeadsRequest(BaseModel):
    max_messages: int = Field(default=20, ge=1, le=50, description="Max messages to inspect in this sync batch")
    query: Optional[str] = Field(default=None, description="Optional search filter criteria (appended to restricted primary filter)")
    integration_id: Optional[str] = Field(default=None, description="Specific Gmail integration ID to sync")
    newer_than_days: int = Field(default=30, ge=1, le=365, description="Only fetch messages newer than N days")

class GmailSyncLeadsResponse(BaseModel):
    status: str
    workspace_id: str
    total_candidate_messages: int
    created_leads: int
    updated_leads: int
    skipped_count: int
    ignored_count: int
    non_lead_count: int
    details: List[dict]