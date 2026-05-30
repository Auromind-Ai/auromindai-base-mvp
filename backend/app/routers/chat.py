from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.schemas.chat import ChatSessionCreate, ChatSessionResponse, ChatMessageResponse, UpdateSessionRequest, ChatStreamRequest, ChatQueryRequest
from uuid import UUID
import logging
from app.database import get_db
from app.routers.auth import get_current_user
from app.core.security import verify_workspace_access
from app.core.chat_provider import get_chat_service
from app.core.exceptions import BillingError
from app.services.chat_service import ChatService
from app.services.session_service import SessionService

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_sessions(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    logger.info(f"[GET SESSIONS] user={current_user.id} workspace={workspace_id}")
    return SessionService.get_sessions(db, str(current_user.id), str(workspace_id), skip, limit)


@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(
    request: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    logger.info(f"[CREATE SESSION] user={current_user.id} workspace={workspace_id}")
    return SessionService.create_session(db, str(current_user.id), str(workspace_id), request.title)


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_session_messages(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    logger.info(f"[GET MESSAGES] user={current_user.id} session={session_id}")
    session = SessionService.get_session_or_404(db, session_id, str(current_user.id), str(workspace_id))
    messages = SessionService.get_messages(db, session.id)
    return [
        ChatMessageResponse(
            id=m.id, role=m.role, content=m.content, created_at=m.created_at
        )
        for m in messages
    ]


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    logger.warning(f"[DELETE SESSION] user={current_user.id} session={session_id}")
    session = SessionService.get_session_or_404(db, session_id, str(current_user.id), str(workspace_id))
    SessionService.delete_session(db, session)
    return {"message": "Session deleted"}


@router.patch("/sessions/{session_id}")
def update_session_title(
    session_id: UUID,
    request: UpdateSessionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    logger.info(f"[UPDATE SESSION] user={current_user.id} session={session_id} title={request.title}")
    session = SessionService.get_session_or_404(db, session_id, str(current_user.id), str(workspace_id))
    SessionService.update_title(db, session, request.title)
    return {"message": "Session updated", "title": session.title}


@router.post("/query")
async def chat_query(
    request: ChatQueryRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    service: ChatService = Depends(get_chat_service),
):
    try:
        workspace_id = verify_workspace_access(current_user, db)
        return await service.handle_chat_query(
            db=db,
            message=request.message,
            workspace_id=str(workspace_id),
            user_id=str(current_user.id),
        )
    except Exception as e:
        logger.error(f"[CHAT QUERY] error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def stream_chat(
    request: ChatStreamRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    service: ChatService = Depends(get_chat_service),
):
    logger.info(f" RAW MODEL FROM REQUEST: {request.model}")
    workspace_id = verify_workspace_access(current_user, db)
    logger.info(f"[STREAM CHAT] user={current_user.id} workspace={workspace_id} session={request.session_id}")
    try:
        return StreamingResponse(
            service.handle_stream_chat(
                message=request.message,
                workspace_id=str(workspace_id),
                session_id=request.session_id,
                use_rag=request.use_rag,
                model = request.model if request.model else "auto",
                user_id=str(current_user.id),
                document_id=request.document_id,
                chat_mode=request.chat_mode,
                source=request.source,
            ),
            media_type="application/x-ndjson",
        )
    except BillingError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except Exception as e:
        logger.error(f"[STREAM CHAT] error: {e}")
        raise HTTPException(500, str(e))