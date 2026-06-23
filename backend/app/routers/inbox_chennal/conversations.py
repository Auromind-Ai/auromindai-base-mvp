from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import schemas
from app.core.security import verify_workspace_access
from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.services.inbox.conversation_service import ConversationService
from app.services.inbox.message_service import MessageService

router = APIRouter(tags=["Unified Inbox"])


@router.get("/conversations")
def get_conversations(
    workspace_id: str | None = None,
    channel: str | None = None,
    status: str | None = "OPEN",
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    verified_workspace_id = verify_workspace_access(current_user, db, workspace_id)
    return ConversationService.list_conversations(
        db,
        workspace_id=verified_workspace_id,
        channel=channel,
        status=status,
    )
@router.get("/conversations/{conversation_id}")
def get_conversation_by_id(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    conv = ConversationService.get_conversation_or_404(
        db,
        workspace_id=workspace_id,
        conversation_id=conversation_id,
    )
    return {
        "id": str(conv.id),
        "channel": conv.channel.value.lower() if conv.channel else None,
        "status": conv.status.value.upper() if conv.status else None,
        "workspace_id": str(conv.workspace_id),
    }


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
    print("BACKEND RECEIVED SEND-REPLY DATA:", data.dict())
    workspace_id = verify_workspace_access(current_user, db)
    return MessageService.send_reply(
        db,
        workspace_id=workspace_id,
        conversation_id=data.conversation_id,
        message=data.message,
        metadata=data.metadata,
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


@router.post("/conversations/{conversation_id}/close")
def close_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from datetime import datetime
    from app.models.ai_action import Lead
    from app.models.lead_scoring import LeadScoreHistory

    workspace_id = verify_workspace_access(current_user, db)
    
    # 1. Fetch conversation
    conversation = ConversationService.get_conversation_or_404(
        db,
        workspace_id=workspace_id,
        conversation_id=conversation_id,
    )
    # Update status to CLOSED
    from app.models.conversation import ConversationStatus
    conversation.status = ConversationStatus.CLOSED
    
    # 2. Update associated lead if exists
    lead = (
        db.query(Lead)
        .filter(Lead.conversation_id == conversation.id, Lead.workspace_id == workspace_id)
        .first()
    )
    if lead:
        if not lead.is_converted and lead.status != "converted":
            lead.status = "closed"
            lead.lead_tier = "inactive"
        
        # Add a timeline/history log event
        history_entry = LeadScoreHistory(
            lead_id=lead.id,
            score_before=lead.score or 0,
            score_after=lead.score or 0,
            reason="conversation_closed",
            created_at=datetime.utcnow()
        )
        db.add(history_entry)
        
    db.commit()
    return {"status": "success"}


@router.post("/conversations/{conversation_id}/convert")
def convert_conversation(
    conversation_id: str,
    body: schemas.lead_scoring.ConvertLeadRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from datetime import datetime, timezone
    from app.models.ai_action import Lead
    from app.models.lead_scoring import LeadScoreHistory
    from app.models.conversation import ConversationStatus
    from app.services.crm.lead_scoring_service import recalculate_lead_score

    workspace_id = verify_workspace_access(current_user, db)
    
    # 1. Fetch conversation
    conversation = ConversationService.get_conversation_or_404(
        db,
        workspace_id=workspace_id,
        conversation_id=conversation_id,
    )
    # Update status to CONVERTED
    conversation.status = ConversationStatus.CONVERTED
    
    # 2. Get or create associated lead
    lead = (
        db.query(Lead)
        .filter(Lead.conversation_id == conversation.id, Lead.workspace_id == workspace_id)
        .first()
    )
    
    is_new_lead = False
    if not lead:
        is_new_lead = True
        lead = Lead(
            workspace_id=workspace_id,
            conversation_id=conversation.id,
            name=conversation.contact_name or conversation.phone or "Unknown Lead",
            phone=conversation.phone,
            source=conversation.channel.value.lower() if conversation.channel else "unknown",
            score=0,
            behavioral_score=0,
            semantic_intent_score=0,
            lead_tier="cold",
        )
        db.add(lead)
        db.flush()

    # Mark lead as converted and save details
    lead.status = "converted"
    lead.is_converted = True
    lead.conversion_amount = body.amount
    lead.converted_product = body.product
    lead.conversion_notes = body.notes
    lead.converted_at = datetime.now(timezone.utc)
    
    # Recalculate lead score
    recalculate_lead_score(lead, db, reason="converted" if not is_new_lead else "created_and_converted", commit=False)

    # 3. Add timeline/history log event
    history_entry = LeadScoreHistory(
        lead_id=lead.id,
        score_before=lead.score or 0,
        score_after=lead.score or 0,
        reason="conversation_converted",
        created_at=datetime.now(timezone.utc)
    )
    db.add(history_entry)
        
    db.commit()

    # Realtime pubsub (Task 7)
    from app.services.analytics.realtime_service import publish_to_workspace
    publish_to_workspace(
        workspace_id=str(workspace_id),
        event_type="lead.converted",
        payload={
            "type": "lead_converted",
            "conversation_id": conversation_id,
            "lead_id": str(lead.id),
            "amount": float(lead.conversion_amount) if lead.conversion_amount is not None else None,
            "product": lead.converted_product,
        },
        conversation_id=conversation_id,
    )

    return {
        "status": "success",
        "conversation_status": "CONVERTED",
        "lead_id": str(lead.id)
    }


