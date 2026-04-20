# from fastapi import APIRouter, Depends, HTTPException
# from sqlalchemy.orm import Session
# from sqlalchemy.sql import func
# from app.database import get_db
# from app.models.learning_event import LearningEvent, FeedbackType
# from app.models.brain import BrainEntry
# from pydantic import BaseModel
# from typing import Optional
# import uuid
# from app.routers.auth import get_current_user
# from app.models.workspace import WorkspaceMember

# router = APIRouter()


# def verify_workspace_access(current_user, db: Session) -> str:
#     workspace_id = current_user.workspace_id
#     membership = db.query(WorkspaceMember).filter(
#         WorkspaceMember.workspace_id == workspace_id,
#         WorkspaceMember.user_id == current_user.id,
#     ).first()
#     if not workspace_id or not membership:
#         raise HTTPException(status_code=403, detail="Workspace not found or access denied")
#     return str(workspace_id)

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

# @router.post("/feedback")
# async def submit_feedback(
#     request: FeedbackRequest,
#     db: Session = Depends(get_db),
#     current_user=Depends(get_current_user),
# ):
#     """Submit user feedback on an AI response"""
#     workspace_id = verify_workspace_access(current_user, db)
#     event = db.query(LearningEvent).filter(
#         LearningEvent.id == request.learning_event_id,
#         LearningEvent.workspace_id == workspace_id,
#     ).first()
    
#     if not event:
#         raise HTTPException(status_code=404, detail="Learning event not found")
    
#     # Convert string to enum
#     try:
#         feedback_enum = FeedbackType[request.feedback_type.upper()]
#     except KeyError:
#         raise HTTPException(status_code=400, detail="Invalid feedback type")
    
#     event.feedback_type = feedback_enum
#     event.feedback_comment = request.comment
#     event.feedback_timestamp = func.now()
    
#     # If SAVE_TO_BRAIN, create Brain entry
#     if feedback_enum == FeedbackType.SAVE_TO_BRAIN:
#         brain_entry = BrainEntry(
#             workspace_id=event.workspace_id,
#             content=f"Q: {event.user_message}\\nA: {event.ai_response}",
#             content_type="learned_interaction"
#         )
#         db.add(brain_entry)
    
#     db.commit()
#     return {
#         "status": "success",
#         "event_id": event.id,
#         "feedback_type": feedback_enum.value
#     }

# @router.post("/learning-event")
# async def create_learning_event(
#     request: LearningEventCreate,
#     db: Session = Depends(get_db),
#     current_user=Depends(get_current_user),
# ):
#     """Create a new learning event (called after each AI interaction)"""
#     workspace_id = verify_workspace_access(current_user, db)
#     event = LearningEvent(
#         id=str(uuid.uuid4()),
#         workspace_id=workspace_id,
#         user_message=request.user_message,
#         ai_response=request.ai_response,
#         conversation_id=request.conversation_id,
#         mcp_verdict=request.mcp_verdict,
#         mcp_confidence=request.mcp_confidence
#     )
#     db.add(event)
#     db.commit()
#     db.refresh(event)
    
#     return {
#         "status": "success",
#         "event_id": event.id
#     }

# @router.get("/learning-events/{workspace_id}")
# async def get_learning_events(
#     workspace_id: str,
#     skip: int = 0,
#     limit: int = 100,
#     db: Session = Depends(get_db),
#     current_user=Depends(get_current_user),
# ):
#     """Get learning events for a workspace"""
#     workspace_id = verify_workspace_access(current_user, db)
#     events = db.query(LearningEvent).filter(
#         LearningEvent.workspace_id == workspace_id
#     ).order_by(LearningEvent.created_at.desc()).offset(skip).limit(limit).all()
    
#     return {
#         "events": [
#             {
#                 "id": e.id,
#                 "user_message": e.user_message,
#                 "ai_response": e.ai_response,
#                 "feedback_type": e.feedback_type.value if e.feedback_type else None,
#                 "created_at": e.created_at.isoformat()
#             }
#             for e in events
#         ]
#     }
