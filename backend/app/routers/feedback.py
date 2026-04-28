from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid

from app.database import get_db
from app.models.feedback import Feedback, LearningData
from app.services.agentic_rag.reinforcement import ReinforcementEngine
from app.services.agentic_rag.learning_cache import learning_cache
from app.routers.auth import get_current_user, CurrentUser
from app.models.workspace import WorkspaceMember
from app.core.security import verify_workspace_access

router = APIRouter()


# Request model (instead of raw dict)
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


@router.post("/feedback")
def submit_feedback(
    request: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    # enforce tenant
    workspace_id = verify_workspace_access(current_user, db)

    engine = ReinforcementEngine(db)

    # 🔍 Validate input
    try:
        data = engine.validate_feedback_input(request.model_dump())
        quality = engine.evaluate_answer_quality(
            answer=data.get("answer"),
            feedback=data.get("feedback")
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        #  NEVER trust user_id from request
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

            user_id=current_user.id,              
            workspace_id=workspace_id             
        )

        db.add(fb)
        db.commit()

    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")

    #  ANALYTICS (scoped to workspace)
    total_feedback = db.query(Feedback).filter(
        Feedback.workspace_id == workspace_id
    ).count()

    learning_triggered = False
    learning_data = None

    if total_feedback > 0 and total_feedback % 10 == 0:
        try:
            learning_data = engine.run_learning_cycle()

            weights = engine.update_weights_from_feedback()
            prompt_improvements = engine.generate_prompt_improvements()

            learning_data["weights"] = weights
            learning_data["prompt_improvements"] = prompt_improvements
            learning_triggered = True

            # cache update
            learning_cache.clear()
            learning_cache.update(learning_data)

            # persist snapshot
            db_obj = LearningData(
                id=uuid.uuid4(),
                data=learning_data
            )
            db.add(db_obj)
            db.commit()

        except Exception:
            db.rollback()

    return {
        "status": "stored",
        "message": "Feedback recorded successfully",
        "total_feedback": total_feedback,
        "learning_triggered": learning_triggered
    }