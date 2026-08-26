import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user_feedback import UserFeedback
from app.schemas.feedback import UserFeedbackCreate
from app.routers.auth import CurrentUser, get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/user-feedback")
def submit_user_feedback(
    payload: UserFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if not payload.message or not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback message cannot be empty."
        )

    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5."
        )

    try:
        fb = UserFeedback(
            workspace_id=payload.workspace_id,
            user_id=payload.user_id or str(current_user.id),
            category=payload.category,
            rating=payload.rating,
            message=payload.message.strip(),
        )
        db.add(fb)
        db.commit()
        db.refresh(fb)

        return {
            "status": "success",
            "message": "Feedback recorded successfully",
            "id": str(fb.id)
        }
    except Exception as e:
        db.rollback()
        logger.exception("Failed to save user feedback: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback. Please try again."
        )
