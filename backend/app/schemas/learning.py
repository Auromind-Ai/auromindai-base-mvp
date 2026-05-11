from pydantic import BaseModel
from typing import Optional

# class FeedbackRequest(BaseModel):
#     learning_event_id: str
#     feedback_type: str  # "thumbs_up", "thumbs_down", "save_to_brain"
#     comment: Optional[str] = None

# class LearningEventCreate(BaseModel):
#     workspace_id: str
#     user_message: str
#     ai_response: str
#     conversation_id: Optional[str] = None
#     mcp_verdict: Optional[str] = None
#     mcp_confidence: Optional[float] = None
