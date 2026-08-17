import json
import logging
import requests
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app import schemas
from app.core.security import verify_workspace_access
from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.models.message import Message
from app.models.conversation import Conversation
from app.models.workspace import Workspace, WorkspaceMember
from app.services.inbox.conversation_service import ConversationService
from app.services.inbox.message_service import MessageService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Unified Inbox"])


def verify_conversation_access(db: Session, current_user, conversation_id: str) -> str:
    from app.models.conversation import Conversation
    from app.models.workspace import WorkspaceMember
    
    try:
        from uuid import UUID
        conv_uuid = UUID(str(conversation_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")
        
    conv = db.query(Conversation).filter(Conversation.id == conv_uuid).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.user_id == current_user.id,
        WorkspaceMember.workspace_id == conv.workspace_id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Access denied to this conversation")
        
    return str(conv.workspace_id)


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
    workspace_id = verify_conversation_access(db, current_user, conversation_id)
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
    workspace_id = verify_conversation_access(db, current_user, conversation_id)
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
    workspace_id = verify_conversation_access(db, current_user, data.conversation_id)
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
    workspace_id = verify_conversation_access(db, current_user, data.conversation_id)
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
 
    workspace_id = verify_conversation_access(db, current_user, conversation_id)
    
    # 1. Fetch conversation
    conversation = ConversationService.get_conversation_or_404(
        db,
        workspace_id=workspace_id,
        conversation_id=conversation_id,
    )
    # Update status to CLOSED
    from app.models.conversation import ConversationStatus
    conversation.status = ConversationStatus.CLOSED
    
    # Clear human takeover state when closing conversation
    from app.models.ai_action import ConversationState
    conv_state = db.query(ConversationState).filter_by(
        conversation_id=conversation.id,
        workspace_id=workspace_id
    ).first()
    if conv_state:
        conv_state.human_takeover = False
    
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
 
    workspace_id = verify_conversation_access(db, current_user, conversation_id)
    
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

@router.get("/media/meta/{media_id}")
@router.get("/inbox/media/meta/{media_id}")
def get_meta_media(
    media_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):

    # Basic validation
    media_id = media_id.strip()

    if not media_id:
        raise HTTPException(
            status_code=400,
            detail="Media ID is required",
        )

    try:
        
        #Find message containing this Meta media ID
        # metadata_json is cast to TEXT so this works whether
        # the DB column is JSON/JSONB/Text.
        # message = (
        #     db.query(Message)
        #     .join(
        #         Conversation,
        #         Conversation.id == Message.conversation_id,
        #     )
        #     .filter(
        #         Conversation.workspace_id.isnot(None),
        #         Message.metadata_json.contains(media_id),
        #     )
        #     .first()
        # )

        # if not message:
        #     raise HTTPException(
        #         status_code=404,
        #         detail="Media not found",
        #     )

        message = (
            db.query(Message)
            .join(
                Conversation,
                Conversation.id == Message.conversation_id,
            )
            .join(
                WorkspaceMember,
                WorkspaceMember.workspace_id == Conversation.workspace_id,
            )
            .filter(
                WorkspaceMember.user_id == current_user.id,
                Message.metadata_json.contains(media_id),
            )
            .first()
        )

        if not message:
            raise HTTPException(
                status_code=404,
                detail="Media not found",
            )


        # Get conversation
        conversation = (
            db.query(Conversation)
            .filter(Conversation.id == message.conversation_id)
            .first()
        )

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation associated with media not found",
            )


        # # Verify current user belongs to conversation workspace
        # membership = (
        #     db.query(WorkspaceMember)
        #     .filter(
        #         WorkspaceMember.user_id == current_user.id,
        #         WorkspaceMember.workspace_id == conversation.workspace_id,
        #     )
        #     .first()
        # )

        # if not membership:
        #     raise HTTPException(
        #         status_code=403,
        #         detail="Access denied to this media",
        #     )

    
        # Get workspace
        workspace = (
            db.query(Workspace)
            .filter(Workspace.id == conversation.workspace_id)
            .first()
        )

        if not workspace:
            raise HTTPException(
                status_code=404,
                detail="Workspace not found",
            )

     
        # Workspace Meta token
        access_token = workspace.meta_access_token

        if not access_token:
            logger.error(
                "Meta access token missing for workspace %s",
                workspace.id,
            )
            raise HTTPException(
                status_code=503,
                detail="WhatsApp Meta connection is not configured",
            )
        
        # Parse metadata_json
        metadata = message.metadata_json

        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except json.JSONDecodeError:
                logger.error(
                    "Invalid metadata_json for message %s",
                    message.id,
                )
                raise HTTPException(
                    status_code=500,
                    detail="Invalid message media metadata",
                )

        if not isinstance(metadata, dict):
            raise HTTPException(
                status_code=500,
                detail="Invalid message media metadata",
            )

        stored_media_id = str(metadata.get("media_id") or "").strip()

        # If Task 1 stores media_id, verify it.
        # If older messages don't have media_id, the URL can
        # still be used as a fallback identifier.
        if stored_media_id and stored_media_id != media_id:
            raise HTTPException(
                status_code=404,
                detail="Media not found",
            )

        media_type = metadata.get("media_type")
        stored_mime_type = metadata.get("mime_type")

        # Allow image, audio, video, document, sticker
        if media_type not in {"image", "audio", "video", "document", "sticker"}:
            raise HTTPException(
                status_code=400,
                detail="Unsupported media type",
            )


        # Ask Meta for temporary media URL
        meta_url = (
            f"https://graph.facebook.com/v19.0/{media_id}"
        )

        headers = {
            "Authorization": f"Bearer {access_token}",
        }

        try:
            meta_response = requests.get(
                meta_url,
                headers=headers,
                timeout=15,
            )
        except requests.RequestException as exc:
            logger.error(
                "Meta media metadata request failed for media %s: %s",
                media_id,
                exc,
            )
            raise HTTPException(
                status_code=502,
                detail="Unable to connect to Meta media service",
            )

    
        # Handle Meta API errors
        if meta_response.status_code == 401:
            logger.error(
                "Meta access token rejected for workspace %s",
                workspace.id,
            )
            raise HTTPException(
                status_code=502,
                detail="Meta authentication failed",
            )

        if meta_response.status_code == 403:
            logger.error(
                "Meta access denied for media %s",
                media_id,
            )
            raise HTTPException(
                status_code=403,
                detail="Meta denied access to this media",
            )

        if meta_response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail="Meta media not found",
            )

        if not meta_response.ok:
            logger.error(
                "Meta media API returned %s: %s",
                meta_response.status_code,
                meta_response.text[:500],
            )
            raise HTTPException(
                status_code=502,
                detail="Meta media service returned an error",
            )

        try:
            media_info = meta_response.json()
        except ValueError:
            logger.error(
                "Invalid JSON response from Meta for media %s",
                media_id,
            )
            raise HTTPException(
                status_code=502,
                detail="Invalid response from Meta media service",
            )

        temporary_url = media_info.get("url")

        if not temporary_url:
            logger.error(
                "Meta response did not contain media URL: %s",
                media_info,
            )
            raise HTTPException(
                status_code=502,
                detail="Meta did not provide a media download URL",
            )

        # Prefer MIME type returned by Meta.
        mime_type = (
            media_info.get("mime_type")
            or stored_mime_type
            or "application/octet-stream"
        )

        #Stream actual media from Meta
        try:
            media_response = requests.get(
                temporary_url,
                stream=True,
                timeout=30,
            )
        except requests.RequestException as exc:
            logger.error(
                "Meta media download failed for media %s: %s",
                media_id,
                exc,
            )
            raise HTTPException(
                status_code=502,
                detail="Unable to download media from Meta",
            )

        if media_response.status_code == 404:
            media_response.close()
            raise HTTPException(
                status_code=404,
                detail="Media download URL has expired or media was removed",
            )

        if media_response.status_code == 403:
            media_response.close()
            raise HTTPException(
                status_code=403,
                detail="Meta denied media download",
            )

        if not media_response.ok:
            status = media_response.status_code
            media_response.close()

            logger.error(
                "Meta media download returned HTTP %s for media %s",
                status,
                media_id,
            )

            raise HTTPException(
                status_code=502,
                detail="Meta media download failed",
            )

        
        #Stream response to browser
        def media_stream():
            try:
                for chunk in media_response.iter_content(
                    chunk_size=64 * 1024
                ):
                    if chunk:
                        yield chunk
            finally:
                media_response.close()

        return StreamingResponse(
            media_stream(),
            media_type=mime_type,
            headers={
                "Cache-Control": "private, no-store",
            },
        )

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception(
            "Unexpected error while serving Meta media %s: %s",
            media_id,
            exc,
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve media",
        )