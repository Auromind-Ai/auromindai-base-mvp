from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import cast, String

from app.database import get_db
from app.models.user_feedback import UserFeedback
from app.models.user import User

router = APIRouter()


@router.get("/user-feedback")
async def get_feedback(
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    try:
        feedback_items = (
            db.query(
                UserFeedback,
                User.full_name,
            )
            .outerjoin(
                User,
                UserFeedback.user_id == cast(User.id, String),
            )
            .order_by(UserFeedback.created_at.desc())
            .all()
        )

        return [
            {
                "id": str(item.id),
                "workspace_id": str(item.workspace_id),
                "user_id": item.user_id,
                "user_name": user_name or item.user_id,
                "category": item.category,
                "rating": item.rating,
                "message": item.message,
                "created_at": (
                    item.created_at.isoformat()
                    if item.created_at
                    else None
                ),
            }
            for item, user_name in feedback_items
        ]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching feedback: {str(e)}",
        )