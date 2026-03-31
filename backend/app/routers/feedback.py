from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.feedback import Feedback, LearningData
from app.services.agentic_rag.reinforcement import ReinforcementEngine
from app.services.agentic_rag.learning_cache import learning_cache
import uuid

router = APIRouter()


@router.post("/feedback")
def submit_feedback(data: dict, db: Session = Depends(get_db)):

    engine = ReinforcementEngine(db)

    #VALIDATE USING YOUR ENGINE
    try:
        data = engine.validate_feedback_input(data)
        quality = engine.evaluate_answer_quality(
            answer=data.get("answer"),
            feedback=data.get("feedback")
        )


    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        #SAFE DEFAULTS
        fb = Feedback(
            query=data.get("query"),
            rewritten_query=data.get("rewritten_query"),
            selected_tool=data.get("tool"),
            answer=data.get("answer"),
            feedback=data.get("feedback"),

            # optional but IMPORTANT
            model=data.get("model") or "unknown",
            latency_ms=data.get("latency_ms") or 0,
            confidence_score=data.get("confidence_score") or 0,
            source=data.get("source") or "unknown",
            session_id=data.get("session_id"),
            user_id=data.get("user_id")
        )

        db.add(fb)
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")

    #ANALYTICS TRIGGER
    total_feedback = db.query(Feedback).count()

    learning_triggered = False
    learning_data = None

    #smarter trigger (avoid multiple triggers in same cycle)
    if total_feedback > 0 and total_feedback % 10 == 0:

        try:
            learning_data = engine.run_learning_cycle()

            #ADD THESE 2
            weights = engine.update_weights_from_feedback()
            prompt_improvements = engine.generate_prompt_improvements()
            learning_data["weights"] = weights
            learning_data["prompt_improvements"] = prompt_improvements
            learning_triggered = True

            #cache update
            learning_cache.clear()
            learning_cache.update(learning_data)

            #persist learning snapshot
            db_obj = LearningData(
                id=uuid.uuid4(),
                data=learning_data
            )
            db.add(db_obj)
            db.commit()


        except Exception as e:
            db.rollback()
    
    return {
        "status": "stored",
        "message": "Feedback recorded successfully",
        "total_feedback": total_feedback,
        "learning_triggered": learning_triggered
    }