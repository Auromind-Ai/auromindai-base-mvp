from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID
import uuid
from datetime import datetime
import logging

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.conversation import ChatSession, ChatMessage
from app.models.workspace import WorkspaceMember
from app.core.security import verify_workspace_access
#  Import your updated ChatService
from app.services.chat_service import ChatService, ChatServiceConfig

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)




# --- Pydantic Models ---
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

class ChatStreamRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    use_rag: bool = True
    model: str = "gpt-4-turbo" # Or whatever default you prefer


# --- Endpoints ---

@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_sessions(  #  REMOVED async
    workspace_id: str,
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all chat sessions for a workspace."""
   
    workspace_id = verify_workspace_access(current_user, db)
    logger.info(f"[GET SESSIONS] user={current_user.id} workspace={workspace_id} skip={skip} limit={limit}")
    sessions = db.query(ChatSession).filter(
        ChatSession.workspace_id == workspace_id,
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).offset(skip).limit(limit).all()
    
    return sessions

@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(  #  REMOVED async
    request: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new chat session."""
   
    workspace_id = verify_workspace_access(current_user, db)
    logger.info(f"[CREATE SESSION] user={current_user.id} workspace={workspace_id} title={request.title}")

    session = ChatSession(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
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
def get_session_messages(  
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all messages for a specific session."""
   
    workspace_id = verify_workspace_access(current_user, db)
    logger.info(f"[GET MESSAGES] user={current_user.id} workspace={workspace_id} session_id={session_id}")
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
        ChatSession.workspace_id == workspace_id,
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
def delete_session( 
    session_id:UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a chat session."""
    
    workspace_id = verify_workspace_access(current_user, db)
    logger.warning(f"[DELETE SESSION] user={current_user.id} workspace={workspace_id} session_id={session_id}")
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
        ChatSession.workspace_id == workspace_id,
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}

@router.patch("/sessions/{session_id}")
def update_session_title( 
    session_id: UUID,
    request: UpdateSessionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update session title."""
    
    workspace_id = verify_workspace_access(current_user, db)
    logger.info(f"[UPDATE SESSION] user={current_user.id} workspace={workspace_id} session_id={session_id} new_title={request.title}")
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
        ChatSession.workspace_id == workspace_id,
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.title = request.title
    db.commit()
    return {"message": "Session updated", "title": session.title}

# ==========================================
# PHASE 2 STREAMING ENDPOINT ADDITION
# ==========================================

@router.post("/stream")
async def stream_chat(
    request: ChatStreamRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Execute a streaming chat operation.
    NOTE: We do NOT inject `db: Session` here. The ChatService 
    handles its own highly-optimized, short-lived DB connections.
    """
    # Assuming config is loaded via env vars or dependency injection
   
    config = ChatServiceConfig() 
    chat_service = ChatService(config)
    workspace_id = verify_workspace_access(current_user, db)
    logger.info(f"[STREAM CHAT] user={current_user.id} workspace={workspace_id} session_id={request.session_id} use_rag={request.use_rag}")

    # Use StreamingResponse to stream the AsyncGenerator to the client
    return StreamingResponse(
        chat_service.handle_stream_chat(
            message=request.message,
            workspace_id=workspace_id,
            session_id=request.session_id,
            use_rag=request.use_rag,
            model=request.model,
            user_id=current_user.id
        ),
        media_type="text/event-stream"
    )
