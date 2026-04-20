from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any, List, Optional
from app.database import get_db
from app.models.brain import EmailMessage, MCPDecision
from app.routers.auth import get_current_user
import json
from app.services.email_automation.email_reply_excutor import EmailReplyExecutor
from app.models.workspace import WorkspaceMember
from app.core.security import verify_workspace_access

router = APIRouter(prefix="/email", tags=["email"])


# --- Response models ---

class EmailItem(BaseModel):
    id: str
    thread_id: Optional[str] = None
    from_: Optional[str] = None
    subject: Optional[str] = None
    date: Optional[Any] = None
    priority: str = "unknown"
    category: str = "unknown"
    confidence: float = 0
    summary: str = "AI summary loading..."
    suggested_reply: Optional[str] = None
    actions: List[Any] = []

    class Config:
        populate_by_name = True

class InboxResponse(BaseModel):
    emails: List[dict]  # dict used to preserve "from" key (reserved word)

class SendReplyResponse(BaseModel):
    status: str




@router.get("/inbox", response_model=InboxResponse)
async def get_ai_inbox(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db)

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
            .filter(
                MCPDecision.message_id == email.gmail_message_id,
                MCPDecision.workspace_id == workspace_id,
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
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db)

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