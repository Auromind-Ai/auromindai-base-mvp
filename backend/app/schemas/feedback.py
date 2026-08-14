from pydantic import BaseModel
from typing import Optional

class FeedbackRequest(BaseModel):
    workspace_id: str
    query: Optional[str] = None
    rewritten_query: Optional[str] = None
    tool: Optional[str] = None
    answer: str
    feedback: str

    model: Optional[str] = None
    latency_ms: Optional[int] = None
    confidence_score: Optional[float] = None
    source: Optional[str] = None
    session_id: Optional[str] = None


class UserFeedbackCreate(BaseModel):
    workspace_id: str
    user_id: str
    category: str = "General"
    rating: int = 5
    message: str


class UserFeedbackResponse(BaseModel):
    id: str
    workspace_id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    category: str
    rating: int
    message: str
    created_at: Optional[str] = None

