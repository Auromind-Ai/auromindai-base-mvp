from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.message import MessageStatus
from app.models.message import SenderType
from app.routers.auth import CurrentUser, get_current_user
from app.schemas import Conversation, Message, MessageCreate
from app.core.security import verify_workspace_access
from app.services.inbox.conversation_service import ConversationService
from app.services.inbox.message_service import MessageService

router = APIRouter(
    prefix="/inbox",
    tags=["inbox"],
    responses={404: {"description": "Not found"}},
)


@router.get("/conversations", response_model=List[Conversation])
def read_conversations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    return ConversationService.list_conversations(
        db,
        workspace_id=workspace_id,
        skip=skip,
        limit=limit,
    )


@router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
def read_messages(
    conversation_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    return MessageService.list_messages(
        db,
        workspace_id=workspace_id,
        conversation_id=conversation_id,
        skip=skip,
        limit=limit,
    )


@router.post("/messages", response_model=Message)
def send_message(
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    conversation = ConversationService.get_or_create_web_conversation(
        db,
        workspace_id=workspace_id,
        conversation_id=message.conversation_id,
        user_id=str(current_user.id),
        contact_name=current_user.full_name or "Unknown",
    )
    normalized_sender_type = (
        message.sender_type
        if isinstance(message.sender_type, SenderType)
        else SenderType[str(message.sender_type).upper()]
    )
    db_message = MessageService.save_manual_message(
        db,
        conversation=conversation,
        body=message.content,
        sender_type=normalized_sender_type,
        status=MessageStatus.RECEIVED if normalized_sender_type == SenderType.USER else MessageStatus.SENT,
        source="inbox_web",
    )
    return db_message

@router.post("/conversations/{conversation_id}/resume_ai")
def resume_ai(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from app.models.ai_action import ConversationState
    workspace_id = verify_workspace_access(current_user, db)
    state = db.query(ConversationState).filter_by(
        conversation_id=conversation_id,
        workspace_id=workspace_id
    ).first()
    
    if state and state.human_takeover:
        state.human_takeover = False
        state.ai_paused_at = None
        db.commit()
        return {"status": "success", "message": "AI automation resumed"}
    
    return {"status": "ignored", "message": "AI is already active or conversation not found"}

