from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.brain import EmailMessage, MCPDecision
from app.routers.auth import get_current_user
import json
from app.services.email_reply_excutor import EmailReplyExecutor

router = APIRouter(prefix="/email", tags=["email"])


@router.get("/inbox")
async def get_ai_inbox(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    emails = (
        db.query(EmailMessage)
        .filter(EmailMessage.workspace_id == workspace_id)
        .order_by(EmailMessage.created_at.desc())
        .limit(50)
        .all()
    )

    inbox = []

    for email in emails:

        decision = (
            db.query(MCPDecision)
            .filter(MCPDecision.message_id == email.gmail_message_id)
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

@router.post("/send-reply")
async def send_reply(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    workspace_id = payload.get("workspace_id")

    if not workspace_id:
        raise HTTPException(status_code=400, detail="workspace_id is required")

    action = {
        "type": "send_reply",
        "data": {
            "reply": payload.get("reply_text"),
            "thread_id": payload.get("thread_id"),
            "message_id": payload.get("message_id"),
            "to_email": payload.get("to_email"),
            "subject": payload.get("subject")
        }
    }

    executor = EmailReplyExecutor()

    executor.execute(
        db=db,
        workspace_id=workspace_id,
        action=action
    )

    return {"status": "success"}