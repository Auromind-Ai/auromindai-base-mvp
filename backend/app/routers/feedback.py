from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.feedback import FeedbackRequest
import uuid
import logging

from app.database import get_db
from app.models.feedback import Feedback, LearningData
from app.services.agentic_rag.reinforcement import ReinforcementEngine
from app.services.agentic_rag.learning_cache import learning_cache
from app.routers.auth import get_current_user, CurrentUser
from app.core.security import verify_workspace_access

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/feedback")
def submit_feedback(
    request: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    # ── 1. Workspace access check (tenant enforcement) ──────────────────────
    try:
        verify_workspace_access(current_user, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Workspace access check failed: %s", e)
        raise HTTPException(status_code=403, detail="Workspace access denied")

    # ── 2. Validate & evaluate input──
    engine = ReinforcementEngine(db)

    try:
        data = engine.validate_feedback_input(request.model_dump())
        engine.evaluate_answer_quality(
            answer=data.get("answer"),
            feedback=data.get("feedback"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ── 3. Persist feedback───────
    try:
        fb = Feedback(
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

    # ── 4. Analytics count (user-scoped since no workspace_id on model) ─────
    try:
        total_feedback = db.query(Feedback).filter(
            Feedback.user_id == str(current_user.id)
        ).count()
    except Exception as e:
        logger.warning("Failed to fetch feedback count: %s", e)
        total_feedback = 0

    # ── 5. Learning cycle (every 10 feedbacks) ──────────────────────────────
    learning_triggered = False

    if total_feedback > 0 and total_feedback % 10 == 0:
        try:
            learning_data = engine.run_learning_cycle()
            learning_data["weights"] = engine.update_weights_from_feedback()
            learning_data["prompt_improvements"] = engine.generate_prompt_improvements()

            learning_cache.clear()
            learning_cache.update(learning_data)

            db.add(LearningData(id=uuid.uuid4(), data=learning_data))
            db.commit()

            learning_triggered = True
            logger.info("Learning cycle triggered at %d feedbacks", total_feedback)

        except Exception as e:
            db.rollback()
            logger.warning("Learning cycle failed (non-critical): %s", e)
            # feedback already saved — don't raise

    return {
        "status": "stored",
        "message": "Feedback recorded successfully",
        "total_feedback": total_feedback,
        "learning_triggered": learning_triggered,
    }