import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user_feedback import UserFeedback
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/user-feedback")
def get_user_feedback(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    try:
        feedbacks = db.query(UserFeedback).order_by(UserFeedback.created_at.desc()).all()

        user_ids = list({fb.user_id for fb in feedbacks if fb.user_id})
        users_map = {}
        if user_ids:
            try:
                users = db.query(User).filter(User.id.in_(user_ids)).all()
                for u in users:
                    name = getattr(u, 'full_name', None) or getattr(u, 'name', None) or u.email
                    users_map[str(u.id)] = name
            except Exception as u_err:
                logger.warning("Failed to lookup feedback user names: %s", u_err)

        results = []
        for fb in feedbacks:
            user_name = users_map.get(str(fb.user_id)) if fb.user_id else None
            results.append({
                "id": str(fb.id),
                "workspace_id": fb.workspace_id,
                "user_id": fb.user_id,
                "user_name": user_name,
                "category": fb.category,
                "rating": fb.rating,
                "message": fb.message,
                "created_at": fb.created_at.isoformat() if fb.created_at else None,
            })

        return results
    except Exception as e:
        logger.exception("Failed to fetch admin user feedback: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user feedback: {str(e)}"
        )
