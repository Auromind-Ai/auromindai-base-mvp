from pydantic import BaseModel
from typing import Optional

class FeedbackRequest(BaseModel):
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
