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
from app.services.config_service import config_service
from fastapi.encoders import jsonable_encoder

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Unified Inbox"])


def create_media_token(
    media_id: str,
    workspace_id: str,
    expires_in: int = 3600,
) -> str:
    expires_at = int(time.time()) + expires_in

    payload = f"{media_id}:{workspace_id}:{expires_at}".encode()

    signature = hmac.new(
        settings.MEDIA_SIGNING_SECRET.encode(),
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

        expected_signature = hmac.new(
            settings.MEDIA_SIGNING_SECRET.encode(),
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
    )

    # Convert Pydantic / SQLAlchemy / ORM objects
    # into actual JSON response objects before modifying media_url.
    response_messages = jsonable_encoder(messages)

    media_base_url = str(request.base_url).rstrip("/")

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
        }:
            continue

        # Create browser-safe signed URL
        token = create_media_token(
            media_id=media_id,
            workspace_id=str(workspace_id),
        )

        signed_url = (
            f"{media_base_url}"
            f"/inbox/media/meta/{media_id}"
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

     
        # Workspace Meta token
        system_token = config_service.get("meta_system_user_token")

        access_token = system_token or workspace.meta_access_token

        if not access_token:
            raise HTTPException(
                status_code=500,
                detail="Meta access token is not configured"
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

        # Only image/audio are required for this task.
        if media_type not in {"image", "audio", "voice"}:
            raise HTTPException(
                status_code=400,
                detail="Unsupported media type",
            )

        if media_type == "voice":
            media_type = "audio"


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
        # MIME type from Meta media metadata.
        mime_type = (
            media_info.get("mime_type")
            or stored_mime_type
            or "application/octet-stream"
        ).split(";")[0].strip()

        if media_type == "audio" and mime_type.startswith("audio/ogg"):
            mime_type = "audio/ogg"

        #Stream actual media from Meta
        try:
            range_header = request.headers.get("range")

            upstream_headers = {}

            if range_header:
                upstream_headers["Range"] = range_header

            media_response = requests.get(
                temporary_url,
                headers=upstream_headers,
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

        if media_response.status_code not in (200, 206):
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

        # Use actual Content-Type returned by Meta
        upstream_content_type = media_response.headers.get("Content-Type")

        if upstream_content_type:
            mime_type = upstream_content_type.split(";")[0].strip()

        
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

        response_headers = {
            "Cache-Control": "private, max-age=300",
            "Accept-Ranges": "bytes",
        }

        content_length = media_response.headers.get("Content-Length")
        content_range = media_response.headers.get("Content-Range")

        if content_length:
            response_headers["Content-Length"] = content_length

        if content_range:
            response_headers["Content-Range"] = content_range

        return StreamingResponse(
            media_stream(),
            status_code=(
                206
                if media_response.status_code == 206
                else 200
            ),
            media_type=mime_type,
            headers=response_headers,
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