from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session
from twilio.twiml.messaging_response import MessagingResponse
from app import models
from app.models.message import Message, MessageStatus, SenderType
from app.models.outbound_message import OutboundMessage
from app.services.agentic_rag.rag_service import get_rag_service
from app.services.inbox.channel_service import ChannelService
from app.services.inbox.conversation_service import ConversationService
from app.services.crm.lead_agent_local import (
    get_all_conversations,
    get_messages as get_local_messages,
)
from app.services.automations.flow_service_v2 import FlowServiceV2
from app.workers.flow_execution import execute_incoming_message, send_next_pending_message
from app.core.security import to_uuid
logger = logging.getLogger(__name__)


from sqlalchemy import or_, and_

class MessageService:
    _VALID_PRIOR_STATES = {
        "sent": ("dispatched", "in_progress"),
        "delivered": ("dispatched", "in_progress", "sent"),
        "read": ("dispatched", "in_progress", "sent", "delivered"),
        "failed": ("dispatched", "in_progress", "sent"),
        "undelivered": ("dispatched", "in_progress", "sent"),
    }
    _TERMINAL_STATES = {"delivered", "failed", "cancelled"}

    @staticmethod
    def list_messages(
        db: Session,
        *,
        workspace_id: str | uuid.UUID,
        conversation_id: str | uuid.UUID,
        skip: int = 0,
        limit: int = 50,
        before_timestamp: str | datetime | None = None,
        before_id: str | uuid.UUID | None = None,
    ):
        ws_uuid = to_uuid(workspace_id)
        conv_uuid = to_uuid(conversation_id)
        messages = (
            db.query(Message)
            .join(
                models.Conversation,
                Message.conversation_id == models.Conversation.id,
            )
            .filter(
                Message.conversation_id == conv_uuid,
                models.Conversation.workspace_id == ws_uuid,
            )
        )

        # Parse before_timestamp if provided as string
        parsed_before_ts = None
        if before_timestamp:
            if isinstance(before_timestamp, datetime):
                parsed_before_ts = before_timestamp
            elif isinstance(before_timestamp, str):
                try:
                    from dateutil.parser import isoparse
                    parsed_before_ts = isoparse(before_timestamp)
                except Exception:
                    try:
                        parsed_before_ts = datetime.fromisoformat(before_timestamp.replace("Z", "+00:00"))
                    except Exception:
                        parsed_before_ts = None

        # Robust composite cursor: (timestamp, id)
        if parsed_before_ts and before_id:
            before_uuid = to_uuid(before_id)
            if before_uuid:
                query = query.filter(
                    or_(
                        Message.timestamp < parsed_before_ts,
                        and_(
                            Message.timestamp == parsed_before_ts,
                            Message.id < before_uuid,
                        ),
                    )
                )
            else:
                query = query.filter(Message.timestamp < parsed_before_ts)
        elif parsed_before_ts:
            query = query.filter(Message.timestamp < parsed_before_ts)

        # Fetch latest messages first (descending), then reverse to return in chronological order
        messages = (
            query.order_by(Message.timestamp.desc(), Message.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        messages.reverse()

        result = []

        for message in messages:
            metadata = message.metadata_json or {}

            if isinstance(metadata, str):
                try:
                    metadata = json.loads(metadata)
                except (json.JSONDecodeError, TypeError):
                    metadata = {}

            result.append({
                "id": str(message.id),
                "conversation_id": str(message.conversation_id),
                "content": message.content,
                "sender_type": message.sender_type,
                "status": message.status,
                "timestamp": message.timestamp,
                "is_read": message.is_read,
                "source": message.source,
                "external_id": message.external_id,
                "media_id": metadata.get("media_id"),
                "media_url": metadata.get("media_url"),
                "media_type": metadata.get("media_type"),
                "mime_type": metadata.get("mime_type"),

            })

        return result

    @staticmethod
    def create_message(
        db: Session,
        *,
        conversation: models.Conversation,
        content: str,
        sender_type: SenderType,
        status: MessageStatus,
        metadata: Optional[dict[str, Any]] = None,
        external_id: str | None = None,
        source: str | None = None,
    ) -> Message:
        message = Message(
            id=uuid.uuid4(),
            conversation_id=conversation.id,
            content=content,
            sender_type=sender_type,
            status=status,
            external_id=external_id,
            source=source,
            metadata_json=json.dumps(metadata or {}),
        )
        conversation.updated_at = datetime.utcnow()
        db.add(message)
        db.flush()
        return message

    @staticmethod
    def persist_inbound_message(
        db: Session,
        *,
        conversation: models.Conversation,
        body: str,
        metadata: Optional[dict[str, Any]] = None,
        external_id: str | None = None,
        source: str = "webhook",
    ) -> tuple[Message, bool]:
        if external_id:
            existing = db.query(Message).filter(Message.external_id == external_id).first()
            if existing:
                return existing, False

        message = MessageService.create_message(
            db,
            conversation=conversation,
            content=body,
            sender_type=SenderType.USER,
            status=MessageStatus.RECEIVED,
            metadata=metadata,
            external_id=external_id,
            source=source,
        )
        return message, True

    @staticmethod
    def persist_manual_message(
        db: Session,
        *,
        conversation: models.Conversation,
        body: str,
        sender_type: SenderType,
        status: MessageStatus,
        metadata: Optional[dict[str, Any]] = None,
        external_id: str | None = None,
        source: str = "manual",
    ) -> Message:
        return MessageService.create_message(
            db,
            conversation=conversation,
            content=body,
            sender_type=sender_type,
            status=status,
            metadata=metadata,
            external_id=external_id,
            source=source,
        )

    @staticmethod
    def save_manual_message(
        db: Session,
        *,
        conversation: models.Conversation,
        body: str,
        sender_type: SenderType,
        status: MessageStatus,
        metadata: Optional[dict[str, Any]] = None,
        external_id: str | None = None,
        source: str = "manual",
    ) -> Message:
        message = MessageService.persist_manual_message(
            db,
            conversation=conversation,
            body=body,
            sender_type=sender_type,
            status=status,
            metadata=metadata,
            external_id=external_id,
            source=source,
        )
        db.commit()
        db.refresh(message)
        return message

    @staticmethod
    def enqueue_incoming_processing(
        conversation_id: str,
        body: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> None:
        try:
            execute_incoming_message.delay(
                conversation_id=str(conversation_id),
                message=body,
                metadata=metadata or {},
            )
        except Exception as exc:
            logger.warning(
                "Could not enqueue incoming message processing (Redis/Celery down?): %s",
                exc,
            )

    @staticmethod
    def send_reply(
        db: Session,
        *,
        workspace_id: str,
        conversation_id: str,
        message: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        conversation = ConversationService.get_conversation_or_404(
            db,
            workspace_id=workspace_id,
            conversation_id=conversation_id,
        )
        enriched_metadata = (metadata or {}).copy()
        template_name = enriched_metadata.get("template_name")
        if template_name:
            from app.models.templates import Template
            try:
                template = db.query(Template).filter(
                    Template.name == template_name,
                    Template.workspace_id == workspace_id
                ).first()
                if template:
                    if template.header:
                        enriched_metadata["template_header"] = template.header
                    if template.footer:
                        enriched_metadata["template_footer"] = template.footer
                    if template.cta:
                        btn_text = template.cta_btn_title or "Visit"
                        enriched_metadata["buttons"] = [
                            {
                                "text": btn_text,
                                "url": template.cta
                            }
                        ]
                    if template.type in {"IMAGE", "VIDEO", "DOCUMENT"}:
                        media_url = enriched_metadata.get("media_url") or enriched_metadata.get("header_url")
                        if media_url:
                            enriched_metadata["media_url"] = media_url
                            enriched_metadata["message_type"] = template.type.lower()
            except Exception as e:
                logger.warning(f"Error enriching metadata in send_reply: {e}")

        stored_message = MessageService.create_message(
            db,
            conversation=conversation,
            content=message,
            sender_type=SenderType.AGENT,
            status=MessageStatus.SENT,
            metadata=enriched_metadata,
            source="manual_reply",
        )
        try:
            external_id = ChannelService.send_message(conversation, message, enriched_metadata)
        except RuntimeError as e:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=503,
                detail=f"This channel is not configured yet: {str(e)}"
            )
        stored_message.external_id = external_id
        MessageService._trigger_human_takeover(db, conversation)

        # Trigger score update on Agent reply (Task 6)
        from app.models.ai_action import Lead
        from app.services.crm.lead_scoring_service import recalculate_lead_score
        
        lead = db.query(Lead).filter(Lead.conversation_id == conversation.id).first()
        if lead:
            lead.last_activity_at = datetime.utcnow()
            recalculate_lead_score(lead, db, reason="agent_reply", commit=False)

        db.commit()
        db.refresh(stored_message)
        return {
            "status": "sent",
            "message_id": str(stored_message.id),
            "external_id": external_id,
        }

    @staticmethod
    def _trigger_human_takeover(db: Session, conversation) -> None:
        """Mark conversation as human-takeover so AI automation is paused."""
        try:
            from app.models.ai_action import ConversationState
            from datetime import timezone

            state = (
                db.query(ConversationState)
                .filter_by(
                    workspace_id=conversation.workspace_id,
                    conversation_id=conversation.id,
                )
                .first()
            )
            if state:
                state.human_takeover = True
                state.ai_paused_at = datetime.now(timezone.utc)
            else:
                state = ConversationState(
                    workspace_id=conversation.workspace_id,
                    conversation_id=conversation.id,
                    human_takeover=True,
                    ai_paused_at=datetime.now(timezone.utc),
                )
                db.add(state)
            
            # Unlock conversation on human takeover/manual handoff
            conversation.agent_locked = False
            conversation.active_agent = None
            conversation.active_workflow_id = None
            db.add(conversation)
            logger.info(
                "[HUMAN_TAKEOVER] Activated for conversation %s",
                conversation.id,
            )
        except Exception as e:
            logger.error(
                "[HUMAN_TAKEOVER] Failed to activate for conversation %s: %s",
                conversation.id, e,
                exc_info=True,
            )

    @staticmethod
    async def generate_ai_suggestion(
        db: Session,
        *,
        workspace_id: str,
        conversation_id: str,
        message: str,
    ) -> dict[str, str]:
        ConversationService.get_conversation_or_404(
            db,
            workspace_id=workspace_id,
            conversation_id=conversation_id,
        )
        messages = (
            db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.timestamp.desc())
            .limit(5)
            .all()
        )
        history = "\n".join([f"{item.sender_type}: {item.content}" for item in reversed(messages)])
        query = f"""
Conversation History:
{history}

User Message:
{message}
"""
        rag = get_rag_service()
        reply = await rag.agent_loop(
            db=db,
            workspace_id=workspace_id,
            query=query,
        )
        return {"suggestion": reply}

    @staticmethod
    async def test_trigger(
        db: Session,
        *,
        workspace_id: str,
        message: str,
    ) -> dict[str, Any]:
        conversation = ConversationService.get_first_workspace_conversation(db, workspace_id)
        if not conversation:
            return {"status": "no conversation found"}

        flow_service = FlowServiceV2()
        handled = await flow_service.execute_incoming_message(
            db,
            conversation_id=conversation.id,
            inbound_text=message,
            metadata={},
        )
        return {"status": "trigger tested", "handled": handled}

    @staticmethod
    def local_conversations():
        return get_all_conversations()

    @staticmethod
    def local_messages(user_id: str):
        return get_local_messages(user_id)

    @staticmethod
    def handle_twilio_status_callback(form_data, db: Session, outbound_message_id: Optional[str] = None):
        message_sid = form_data.get("MessageSid") or form_data.get("SmsSid")
        message_status = (form_data.get("MessageStatus") or form_data.get("SmsStatus") or "").lower()

        if not message_sid and not outbound_message_id:
            return str(MessagingResponse())
        if not message_status:
            return str(MessagingResponse())

        row = None
        try:
            if outbound_message_id:
                try:
                    row = (
                        db.query(OutboundMessage)
                        .filter(OutboundMessage.id == uuid.UUID(str(outbound_message_id)))
                        .with_for_update()
                        .first()
                    )
                except Exception:
                    db.rollback()
                    row = None

            if not row and message_sid:
                try:
                    row = (
                        db.query(OutboundMessage)
                        .filter(OutboundMessage.twilio_sid == message_sid)
                        .with_for_update()
                        .first()
                    )
                except Exception:
                    db.rollback()
                    row = None

            if not row:
                logger.warning("[handle_twilio_status_callback] No row found for SID=%s, ID=%s", message_sid, outbound_message_id)
                db.rollback()
                return str(MessagingResponse())

            if message_sid and not row.twilio_sid:
                row.twilio_sid = message_sid

            conversation_id = str(row.conversation_id)
            if row.status in MessageService._TERMINAL_STATES:
                db.commit()
                return str(MessagingResponse())

            if message_status == "queued":
                db.commit()
                return str(MessagingResponse())

            if message_status == "sent":
                valid_priors = MessageService._VALID_PRIOR_STATES.get("sent", ())
                if row.status not in valid_priors:
                    db.commit()
                    return str(MessagingResponse())
                row.status = "sent"

                metadata = row.metadata_json or {}

                if isinstance(metadata, str):
                    metadata = json.loads(metadata)

                inbox_message_id = metadata.get("inbox_message_id")

                if inbox_message_id:
                    inbox_msg = db.query(Message).filter(
                        Message.id == uuid.UUID(str(inbox_message_id))
                    ).first()

                    if inbox_msg:
                        inbox_msg.status = MessageStatus.SENT
                db.commit()
                # Do NOT unlock next message on 'sent'. Await 'delivered' status callback.
                return str(MessagingResponse())

            if message_status == "delivered":
                valid_priors = MessageService._VALID_PRIOR_STATES.get("delivered", ())
                if row.status not in valid_priors:
                    db.commit()
                    return str(MessagingResponse())
                row.status = "delivered"

                metadata = row.metadata_json or {}

                if isinstance(metadata, str):
                    metadata = json.loads(metadata)

                inbox_message_id = metadata.get("inbox_message_id")

                if inbox_message_id:
                    inbox_msg = db.query(Message).filter(
                        Message.id == uuid.UUID(str(inbox_message_id))
                    ).first()

                    if inbox_msg:
                        inbox_msg.status = MessageStatus.DELIVERED

                db.commit()

                # Unlock & dispatch next message ONLY when previous message is DELIVERED
                send_next_pending_message.apply_async(
                    args=[conversation_id],
                    countdown=0
                )

                return str(MessagingResponse())

            if message_status in ("failed", "undelivered"):
                valid_priors = MessageService._VALID_PRIOR_STATES.get("failed", ())
                if row.status not in valid_priors:
                    db.commit()
                    return str(MessagingResponse())
                row.status = "failed"

                metadata = row.metadata_json or {}
                if isinstance(metadata, str):
                    metadata = json.loads(metadata)

                inbox_message_id = metadata.get("inbox_message_id")
                if inbox_message_id:
                    inbox_msg = db.query(Message).filter(
                        Message.id == uuid.UUID(str(inbox_message_id))
                    ).first()
                    if inbox_msg:
                        inbox_msg.status = MessageStatus.FAILED

                db.commit()
                send_next_pending_message.apply_async(args=[conversation_id], countdown=1)
                return str(MessagingResponse())

            db.commit()
            return str(MessagingResponse())
        except Exception as e:
            db.rollback()
            logger.exception("[handle_twilio_status_callback] Exception in callback processing: %s", e)
            return str(MessagingResponse())
