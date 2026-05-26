import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import verify_workspace_access
from app.database import get_db
from app.models.feedback import Feedback
from app.routers.auth import CurrentUser, get_current_user
from app.schemas.feedback import FeedbackRequest
from app.services.agentic_rag.reinforcement import ReinforcementEngine

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/feedback")
def submit_feedback(
    request: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = request.workspace_id
    try:
        workspace_id = verify_workspace_access(current_user, db, workspace_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Workspace access check failed: %s", e)
        raise HTTPException(status_code=403, detail="Workspace access denied")

    engine = ReinforcementEngine(db, workspace_id=workspace_id)

    try:
        data = engine.validate_feedback_input(request.model_dump())
        engine.evaluate_answer_quality(
            answer=data.get("answer"),
            feedback=data.get("feedback"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        fb = Feedback(
            workspace_id=workspace_id,
            query=data.get("query"),
            rewritten_query=data.get("rewritten_query"),
            selected_tool=data.get("tool"),
            answer=data.get("answer"),
            feedback=data.get("feedback"),
            model=data.get("model") or "unknown",
            latency_ms=data.get("latency_ms") or 0,
            confidence_score=data.get("confidence_score") or 0,
            source=data.get("source") or "unknown",
            session_id=data.get("session_id"),
            user_id=str(current_user.id),
        )
        db.add(fb)
        db.commit()
        db.refresh(fb)
    except Exception as e:
        db.rollback()
        logger.exception("Failed to persist feedback: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save feedback")

    try:
        total_feedback = db.query(Feedback).filter(
            Feedback.workspace_id == workspace_id,
            Feedback.user_id == str(current_user.id)
        ).count()
    except Exception as e:
        logger.warning("Failed to fetch feedback count: %s", e)
        total_feedback = 0

    learning_triggered = False
    if total_feedback > 0 and total_feedback % 10 == 0:
        logger.warning(
            "Learning cycle skipped at %d feedbacks because tenant-scoped learning is not implemented yet",
            total_feedback,
        )

    return {
        "status": "stored",
        "message": "Feedback recorded successfully",
        "total_feedback": total_feedback,
        "learning_triggered": learning_triggered,
    }
