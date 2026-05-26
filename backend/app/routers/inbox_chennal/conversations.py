from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.core.security import verify_workspace_access
from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.services.inbox.conversation_service import ConversationService
from app.services.inbox.message_service import MessageService

router = APIRouter(prefix="/api", tags=["Unified Inbox"])


@router.get("/conversations")
def get_conversations(
    workspace_id: str,
    channel: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    verified_workspace_id = verify_workspace_access(current_user, db, workspace_id)
    return ConversationService.list_conversations(
        db,
        workspace_id=verified_workspace_id,
        channel=channel,
    )


@router.get("/messages/{conversation_id}")
def get_messages(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    return MessageService.list_messages(
        db,
        workspace_id=workspace_id,
        conversation_id=conversation_id,
    )


@router.post("/send-reply")
def send_reply(
    data: schemas.SendReply,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    return MessageService.send_reply(
        db,
        workspace_id=workspace_id,
        conversation_id=data.conversation_id,
        message=data.message,
    )


@router.post("/ai-suggest")
async def ai_suggest(
    data: schemas.AISuggest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    return await MessageService.generate_ai_suggestion(
        db,
        workspace_id=workspace_id,
        conversation_id=data.conversation_id,
        message=data.message,
    )
