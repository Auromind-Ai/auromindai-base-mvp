from pydantic import BaseModel
from typing import Any, List, Optional

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
