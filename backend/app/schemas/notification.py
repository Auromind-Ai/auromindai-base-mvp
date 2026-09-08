from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import List, Optional


class NotificationCounts(BaseModel):
    all: int = 0
    unread: int = 0
    mentions: int = 0
    updates: int = 0
    system: int = 0


class NotificationResponse(BaseModel):
    id: UUID
    type: str
    category: Optional[str] = "system"
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    unread_count: int
    counts: Optional[NotificationCounts] = None

