from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.conversation import ChatSession, ChatMessage
from uuid import UUID
import uuid
from datetime import datetime
import logging

router = APIRouter(prefix="/chat", tags=["chat"])

logger = logging.getLogger(__name__)

# Pydantic Models
class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"
    workspace_id: str

class ChatSessionResponse(BaseModel):
    id: UUID
    title: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    workspace_id: UUID

    class Config:
        from_attributes = True

class ChatMessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class UpdateSessionRequest(BaseModel):
    title: str

# Endpoints

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_sessions(
    workspace_id: str,
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all chat sessions for a workspace."""
    
    sessions = db.query(ChatSession).filter(
        ChatSession.workspace_id == workspace_id,
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).offset(skip).limit(limit).all()
    
    return sessions

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    request: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new chat session."""
    session = ChatSession(
        id=str(uuid.uuid4()),
        workspace_id=request.workspace_id,
        user_id=current_user.id,
        title=request.title
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        workspace_id=session.workspace_id
    )

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_session_messages(
    session_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all messages for a specific session."""
    # Verify ownership
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()
    
    return [
        ChatMessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=str(m.created_at)
        ) for m in messages
    ]

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a chat session."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}

@router.patch("/sessions/{session_id}")
async def update_session_title(
    session_id: str,
    request: UpdateSessionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update session title."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.title = request.title
    db.commit()
    return {"message": "Session updated", "title": session.title}
