import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import schemas
from app.core.config import settings
from app.core.security import verify_workspace_access
from app.database import get_db
from app.models.workspace import Workspace
from app.routers.auth import CurrentUser, get_current_user
from app.services.inbox.conversation_service import ConversationService
from app.services.inbox.message_service import MessageService
from app.services.inbox.webhook_service import WebhookService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/twilio",
    tags=["twilio"],
    responses={404: {"description": "Not found"}},
)


#  Connect ─

class TwilioConnectRequest(BaseModel):
    sid: str
    token: str
    phone: str
    workspace_id: str


@router.post("/connect")
def connect_twilio(
    payload: TwilioConnectRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    verify_workspace_access(current_user, db, payload.workspace_id)
    workspace = db.query(Workspace).filter(Workspace.id == payload.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    workspace.twilio_account_sid = payload.sid
    workspace.twilio_auth_token = payload.token
    workspace.twilio_phone_number = payload.phone
    db.commit()
    return {"status": "connected", "message": "Twilio connected successfully"}


#  Webhooks 

@router.post("/webhook")
async def twilio_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        form_data = await request.form()
        return await WebhookService.handle_twilio_webhook(form_data, db)
    except Exception as exc:
        logger.exception("Webhook error: %s", exc)
        return {"status": "error"}


@router.post("/status-callback")
async def twilio_status_callback(request: Request, db: Session = Depends(get_db)):
    try:
        form = await request.form()
        outbound_message_id = request.query_params.get("outbound_message_id")
        return await MessageService.handle_twilio_status_callback(form, db, outbound_message_id=outbound_message_id)
    except Exception:
        logger.exception("[status-callback] Unhandled error")
        return {"status": "error"}


#  Conversations

@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    return ConversationService.list_conversations(
        db,
        workspace_id=workspace_id,
        channel="twilio",
    )


@router.get("/conversations/{conversation_id}")
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


#  Actions ─

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
