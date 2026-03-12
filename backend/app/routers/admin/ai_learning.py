from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timedelta

from app.database import get_db

router = APIRouter()


@router.get("/ai-learning")
async def get_learning_events(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Get AI learning events and user feedback.
    """
    try:
        # dummy data
        learning_list = [
            {
                "user_message": "Schedule a meeting with the client",
                "ai_response": "Meeting scheduled for tomorrow at 10 AM",
                "feedback_type": "thumbs_up",
                "user_satisfaction_score": 5,
                "promoted_to_rule": True,
                "created_at": "2026-03-04T11:15:00Z"
            },
            {
                "user_message": "Send a follow-up email to the lead",
                "ai_response": "Email sent with personalized content",
                "feedback_type": "thumbs_down",
                "user_satisfaction_score": 2,
                "promoted_to_rule": False,
                "created_at": "2026-03-04T10:30:00Z"
            },
            {
                "user_message": "Update the CRM with new contact info",
                "ai_response": "CRM updated successfully",
                "feedback_type": "thumbs_up",
                "user_satisfaction_score": 4,
                "promoted_to_rule": True,
                "created_at": "2026-03-03T14:20:00Z"
            }
        ]
        return learning_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching learning events: {str(e)}")
