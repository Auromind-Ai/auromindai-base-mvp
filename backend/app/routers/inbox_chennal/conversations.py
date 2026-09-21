import json
import logging
import requests
import hmac
import hashlib
import base64
import time

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
)
from app.core.config import settings
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
from app.services.analytics.realtime_service import publish_to_workspace
from app.services.config_service import config_service
from fastapi.encoders import jsonable_encoder

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Unified Inbox"])


def create_media_token(
    media_id: str,
    workspace_id: str,
    expires_in: int = 3600,
) -> str:
    # Bucket expiration into 1-hour blocks so the token and URL remain identical
    # across frequent polling requests. This enables browser caching and prevents
    # polling loops from retrying failed media every few seconds.
    now = int(time.time())
    current_bucket = now // 3600
    expires_at = (current_bucket + 2) * 3600

    payload = f"{media_id}:{workspace_id}:{expires_at}".encode()

    secret = (settings.MEDIA_SIGNING_SECRET or settings.SECRET_KEY or "media-signing-secret-default").encode()
    signature = hmac.new(
        secret,
        payload,
        hashlib.sha256,
    ).digest()

    encoded_payload = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    encoded_signature = base64.urlsafe_b64encode(signature).decode().rstrip("=")

    return f"{encoded_payload}.{encoded_signature}"


def verify_media_token(
    token: str,
    media_id: str,
    workspace_id: str,
) -> bool:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)

        payload = base64.urlsafe_b64decode(
            encoded_payload + "=" * (-len(encoded_payload) % 4)
        )

        signature = base64.urlsafe_b64decode(
            encoded_signature + "=" * (-len(encoded_signature) % 4)
        )

        secret = (settings.MEDIA_SIGNING_SECRET or settings.SECRET_KEY or "media-signing-secret-default").encode()
        expected_signature = hmac.new(
            secret,
            payload,
            hashlib.sha256,
        ).digest()

        if not hmac.compare_digest(
            signature,
            expected_signature,
        ):
            return False

        payload_media_id, payload_workspace_id, expires_at = (
            payload.decode().split(":")
        )

        if payload_media_id != str(media_id):
            return False

        if payload_workspace_id != str(workspace_id):
            return False

        if int(expires_at) < int(time.time()):
            return False

        return True

    except Exception:
        return False


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


@router.get("/conversations/counts")
def get_conversation_counts(
    workspace_id: str | None = None,
    channel: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    verified_workspace_id = verify_workspace_access(current_user, db, workspace_id)
    return ConversationService.get_conversation_counts(
        db,
        workspace_id=verified_workspace_id,
        channel=channel,
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
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    before_timestamp: str | None = None,
    before_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_conversation_access(
        db,
        current_user,
        conversation_id,
    )

    messages = MessageService.list_messages(
        db,
        workspace_id=workspace_id,
        conversation_id=conversation_id,
        skip=skip,
        limit=limit,
        before_timestamp=before_timestamp,
        before_id=before_id,
    )

    # Convert Pydantic / SQLAlchemy / ORM objects
    # into actual JSON response objects before modifying media_url.
    response_messages = jsonable_encoder(messages)

    if isinstance(response_messages, dict):
        response_messages = [response_messages]

    for message in response_messages:
        if not isinstance(message, dict):
            continue

        # Get metadata from serialized response
        metadata = (
            message.get("metadata_json")
            or message.get("metadata")
            or {}
        )

        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except json.JSONDecodeError:
                metadata = {}

        if not isinstance(metadata, dict):
            metadata = {}

        # Find media ID
        media_id = (
            metadata.get("media_id")
            or message.get("media_id")
            or ""
        )

        media_id = str(media_id).strip()

        # Find media type
        media_type = (
            message.get("media_type")
            or metadata.get("media_type")
            or metadata.get("message_type")
            or ""
        ).lower()

        # Normalize voice → audio
        if media_type == "voice":
            media_type = "audio"

        if not media_id:
            continue

        if media_type not in {
            "image",
            "audio",
            "video",
        }:
            continue

        # Create browser-safe signed URL
        token = create_media_token(
            media_id=media_id,
            workspace_id=str(workspace_id),
        )

        signed_url = (
            f"/api/inbox/media/meta/{media_id}"
            f"?token={token}"
        )

        # IMPORTANT:
        # overwrite serialized response itself
        message["media_url"] = signed_url
        message["media_type"] = media_type

        # Keep mime type available to frontend
        if not message.get("mime_type"):
            mime = metadata.get("mime_type")
            if mime:
                message["mime_type"] = mime

        # Also update metadata copy if frontend reads meta.media_url
        if isinstance(metadata, dict):
            metadata["media_url"] = signed_url
            metadata["media_type"] = media_type

            message["metadata"] = metadata

    return response_messages


@router.post("/conversations/{conversation_id}/read")
def mark_conversation_as_read(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_conversation_access(db, current_user, conversation_id)
    from app.models.message import Message, SenderType
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.is_read == False,
        Message.sender_type == SenderType.USER,
    ).update({Message.is_read: True}, synchronize_session=False)
    db.commit()
    return {"status": "success", "conversation_id": conversation_id}


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
    from datetime import datetime, timezone
    from app.models.ai_action import Lead
    from app.models.lead_scoring import LeadScoreHistory
 
    workspace_id = verify_conversation_access(db, current_user, conversation_id)
    
    # 1. Fetch conversation
    conversation = ConversationService.get_conversation_or_404(
        db,
        workspace_id=workspace_id,
        conversation_id=conversation_id,
    )
    # Update status to CLOSED and record closed_at timestamp
    from app.models.conversation import ConversationStatus
    conversation.status = ConversationStatus.CLOSED
    conversation.closed_at = datetime.now(timezone.utc)
    
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

    # Realtime pubsub
    try:
       
        publish_to_workspace(
            workspace_id=str(workspace_id),
            event_type="conversation_updated",
            payload={
                "type": "conversation_closed",
                "conversation_id": conversation_id,
            },
            conversation_id=conversation_id,
        )
    except Exception as evt_exc:
        logger.warning(f"Failed to publish conversation_closed event: {evt_exc}")

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

    if is_new_lead:
        try:
            from app.core.event_bus import emit_event
            emit_event(
                event_name="lead.created",
                payload={
                    "lead_id": str(lead.id),
                    "lead_name": lead.name or lead.phone or "New Lead",
                    "lead_email": getattr(lead, "email", None) or lead.phone or "N/A",
                    "lead_phone": lead.phone or "N/A",
                    "source": (lead.source or "web").upper(),
                    "assigned_agent": getattr(lead, "assigned_to", None) or "Unassigned",
                    "workspace_id": str(workspace_id)
                },
                workspace_id=workspace_id,
                idempotency_key=f"lead_created:{lead.id}",
                db=db
            )
        except Exception as evt_exc:
            logger.warning(f"Failed to emit lead.created event: {evt_exc}")

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

from app.services.inbox.meta_media_service import MetaMediaService, FAILED_META_MEDIA_CACHE

@router.get("/media/meta/{media_id}")
@router.get("/inbox/media/meta/{media_id}")
def get_meta_media(
    media_id: str,
    request: Request,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    # Basic validation
    media_id = media_id.strip()

    if not media_id:
        raise HTTPException(
            status_code=400,
            detail="Media ID is required",
        )

    try:
        message = (
            db.query(Message)
            .join(
                Conversation,
                Conversation.id == Message.conversation_id,
            )
            .filter(
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

        if not verify_media_token(
            token=token,
            media_id=media_id,
            workspace_id=str(workspace.id),
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired media token",
            )

        # Parse metadata_json
        metadata = message.metadata_json or {}
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except json.JSONDecodeError:
                metadata = {}
        if not isinstance(metadata, dict):
            metadata = {}

        # 1. Fast path: check persistent storage/local cache first
        cached_bytes, cached_mime, stored_path = MetaMediaService.get_cached_media(
            workspace_id=workspace.id,
            media_id=media_id,
            message=message,
            db=db,
        )
        if cached_bytes:
            return Response(
                content=cached_bytes,
                media_type=cached_mime or "application/octet-stream",
                headers={
                    "Cache-Control": "public, max-age=31536000, immutable",
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(len(cached_bytes)),
                },
            )

        # 2. Negative cache check
        if FAILED_META_MEDIA_CACHE.get(media_id, 0) > time.time():
            raise HTTPException(
                status_code=404,
                detail="Meta media expired or unavailable",
            )

        # 3. Download from Meta, store persistently, and return
        file_bytes, mime_type, stored_path = MetaMediaService.download_and_store_meta_media(
            workspace_id=workspace.id,
            media_id=media_id,
            message_id=message.id,
            mime_type=metadata.get("mime_type"),
            media_type=metadata.get("media_type"),
            db=db,
        )

        if not file_bytes:
            raise HTTPException(
                status_code=404,
                detail="Meta media expired or unavailable",
            )

        return Response(
            content=file_bytes,
            media_type=mime_type or "application/octet-stream",
            headers={
                "Cache-Control": "public, max-age=31536000, immutable",
                "Accept-Ranges": "bytes",
                "Content-Length": str(len(file_bytes)),
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
