from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.schemas.email import InboxResponse, SendReplyResponse, SendEmailReplyRequest
from app.database import get_db
from app.models.brain import EmailMessage, MCPDecision
from app.routers.auth import get_current_user
from app.services.email_automation.email_reply_excutor import EmailReplyExecutor
from app.core.security import verify_workspace_access
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email", tags=["email"])


@router.get("/inbox", response_model=InboxResponse)
async def get_ai_inbox(
    workspace_id: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    verified_workspace_id = verify_workspace_access(current_user, db, workspace_id)

    emails = (
        db.query(EmailMessage)
        .filter(EmailMessage.workspace_id == str(verified_workspace_id))
        .order_by(EmailMessage.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    inbox = []

    for email in emails:
        decision = (
            db.query(MCPDecision)
            .filter(
                MCPDecision.message_id == email.gmail_message_id,
                MCPDecision.workspace_id == str(verified_workspace_id),
            )
            .first()
        )

        inbox.append({
            "id": email.gmail_message_id,
            "thread_id": email.thread_id,
            "from": email.sender,
            "subject": email.subject,
            "date": email.created_at,

            # MCP AI fields
            "priority": decision.priority if decision else "unknown",
            "category": decision.category if decision else "unknown",
            "confidence": decision.confidence if decision else 0,
            "summary": decision.summary if decision else "AI summary loading...",
            "suggested_reply": decision.suggested_reply if decision else None,
            "actions": decision.executed_actions_json if decision and decision.executed_actions_json else []
        })

    return {"emails": inbox}

@router.post("/send-reply", response_model=SendReplyResponse)
async def send_reply(
    payload: SendEmailReplyRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    verified_workspace_id = verify_workspace_access(current_user, db, payload.workspace_id)

    action = {
        "type": "send_reply",
        "data": {
            "reply": payload.reply_text,
            "thread_id": payload.thread_id,
            "message_id": payload.message_id,
            "to_email": payload.to_email,
            "subject": payload.subject
        }
    }

    try:
        executor = EmailReplyExecutor()
        executor.execute(
            db=db,
            workspace_id=str(verified_workspace_id),
            action=action
        )
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send email reply: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email reply. Please verify Gmail integration status.")