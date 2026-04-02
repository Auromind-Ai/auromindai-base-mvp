from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timedelta

from app.database import get_db
from app.models.feedback import Feedback
from app.models.learning_event import LearningEvent, FeedbackType
from app.services.agentic_rag.rag_service import get_rag_service

router = APIRouter()

@router.get("/ai-learning")
async def get_learning_events(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Get AI learning events and user feedback from both RAG feedback and Learning events tables.
    """
    try:
        # 1. Fetch from RAG Feedback (ReinforcementEngine data)
        rag_feedbacks = db.query(Feedback).order_by(Feedback.created_at.desc()).limit(50).all()
        
        # 2. Fetch from AI Learning Events (Complex interaction data)
        learning_events = db.query(LearningEvent).order_by(LearningEvent.created_at.desc()).limit(50).all()
        
        unified_list = []
        
        # Format RAG Feedbacks
        for fb in rag_feedbacks:
            unified_list.append({
                "id": str(fb.id),
                "source": "rag_feedback",
                "user_message": fb.query,
                "ai_response": fb.answer,
                "feedback_type": fb.feedback,  # "up" or "down"
                "user_satisfaction_score": 5 if fb.feedback == "up" else 1,
                "promoted_to_rule": False, # Basic feedback isn't automatically a rule
                "created_at": fb.created_at.isoformat() if fb.created_at else None,
                "metadata": {
                    "tool": fb.selected_tool,
                    "confidence": fb.confidence_score
                }
            })
            
        # Format Learning Events
        for ev in learning_events:
            unified_list.append({
                "id": str(ev.id),
                "source": "ai_learning_event",
                "user_message": ev.user_message,
                "ai_response": ev.ai_response,
                "feedback_type": ev.feedback_type.value if hasattr(ev.feedback_type, 'value') else str(ev.feedback_type),
                "user_satisfaction_score": ev.user_satisfaction_score or 0,
                "promoted_to_rule": ev.promoted_to_rule,
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
                "metadata": {
                    "mcp_verdict": ev.mcp_verdict,
                    "execution_success": ev.execution_success
                }
            })
            
        # Sort by recently created
        unified_list.sort(key=lambda x: x["created_at"] or "", reverse=True)
        
        return unified_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching learning events: {str(e)}")

@router.post("/ai-learning/{event_id}/promote")
async def promote_to_rule(
    event_id: str,
    db: Session = Depends(get_db)
):
    """
    Promote a learning event or feedback to a permanent RAG rule.
    """
    try:
        # Check both tables for the ID
        event = db.query(LearningEvent).filter(LearningEvent.id == event_id).first()
        feedback = None
        
        if not event:
            feedback = db.query(Feedback).filter(Feedback.id == event_id).first()
            
        if not event and not feedback:
            raise HTTPException(status_code=404, detail="Interaction not found")
        
        # Get content to index
        if event:
            user_msg = event.user_message
            ai_resp = event.ai_response
            workspace_id = str(event.workspace_id) if event.workspace_id else None
            event.promoted_to_rule = True
        else:
            # Feedback is guaranteed to exist because of the check above
            user_msg = feedback.query
            ai_resp = feedback.answer
            workspace_id = None
        
        # 2. Ingest into RAG Vector DB
        rag = get_rag_service()
        
        # We index the "Successful interaction" as a rule
        content = f"Instruction/Rule based on successful interaction:\nUser: {user_msg}\nAI: {ai_resp}"
        
        # If workspace_id is missing, use a default or handle accordingly
        target_workspace = workspace_id or "00000000-0000-0000-0000-000000000000"
        
        rag.ingest_document(
            db=db,
            workspace_id=target_workspace,
            text=content,
            title=f"Promoted Rule: {user_msg[:50]}",
            content_type="rule",
            source="learning_promotion",
            metadata={
                "original_event_id": event_id,
                "promoted_at": datetime.now().isoformat()
            }
        )
        
        db.commit()
        return {"status": "success", "message": "Promoted to rule and indexed in Vector DB"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Promotion failed: {str(e)}")
