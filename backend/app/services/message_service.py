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
from app.services.channel_service import ChannelService
from app.services.conversation_service import ConversationService
from app.services.lead_agent_local import (
    get_all_conversations,
    get_messages as get_local_messages,
)
from app.services.flow_service_v2 import FlowServiceV2
from app.workers.flow_execution import execute_incoming_message, send_next_pending_message

logger = logging.getLogger(__name__)


class MessageService:
    _VALID_PRIOR_STATES = {
        "sent": ("dispatched", "in_progress"),
        "delivered": ("dispatched", "in_progress", "sent"),
        "read": ("dispatched", "in_progress", "sent", "delivered"),
        "failed": ("dispatched", "in_progress", "sent"),
        "undelivered": ("dispatched", "in_progress", "sent"),
    }
    _TERMINAL_STATES = {"delivered", "failed", "cancelled"}
    _flow_service = FlowServiceV2()

    @staticmethod
    def list_messages(
        db: Session,
        *,
        workspace_id: str,
        conversation_id: str,
        skip: int = 0,
        limit: int = 100,
    ):
        return (
            db.query(Message)
            .join(models.Conversation, Message.conversation_id == models.Conversation.id)
            .filter(
                Message.conversation_id == conversation_id,
                models.Conversation.workspace_id == workspace_id,
            )
            .order_by(Message.timestamp.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

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
        execute_incoming_message.delay(
            conversation_id=str(conversation_id),
            message=body,
            metadata=metadata or {},
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
        stored_message = MessageService.create_message(
            db,
            conversation=conversation,
            content=message,
            sender_type=SenderType.AGENT,
            status=MessageStatus.SENT,
            metadata=metadata,
            source="manual_reply",
        )
        external_id = ChannelService.send_message(conversation, message, metadata)
        stored_message.external_id = external_id
        db.commit()
        db.refresh(stored_message)
        return {
            "status": "sent",
            "message_id": str(stored_message.id),
            "external_id": external_id,
        }

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

        handled = await MessageService._flow_service.execute_incoming_message(
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
    async def handle_twilio_status_callback(form_data, db: Session):
        message_sid = form_data.get("MessageSid") or form_data.get("SmsSid")
        message_status = (form_data.get("MessageStatus") or form_data.get("SmsStatus") or "").lower()

        if not message_sid or not message_status:
            return str(MessagingResponse())

        row = (
            db.query(OutboundMessage)
            .filter(OutboundMessage.twilio_sid == message_sid)
            .with_for_update()
            .first()
        )
        if not row:
            return str(MessagingResponse())

        conversation_id = str(row.conversation_id)
        if row.status in MessageService._TERMINAL_STATES:
            return str(MessagingResponse())

        if message_status == "queued":
            return str(MessagingResponse())

        if message_status == "sent":
            valid_priors = MessageService._VALID_PRIOR_STATES.get("sent", ())
            if row.status not in valid_priors:
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
            send_next_pending_message.apply_async(args=[conversation_id], countdown=1)
            return str(MessagingResponse())

        if message_status == "delivered":
            valid_priors = MessageService._VALID_PRIOR_STATES.get("delivered", ())
            if row.status not in valid_priors:
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

            send_next_pending_message.apply_async(
                args=[conversation_id],
                countdown=1
            )

            return str(MessagingResponse())

        if message_status in ("failed", "undelivered"):
            valid_priors = MessageService._VALID_PRIOR_STATES.get("failed", ())
            if row.status not in valid_priors:
                return str(MessagingResponse())
            row.status = "failed"
            db.commit()
            send_next_pending_message.apply_async(args=[conversation_id], countdown=2)
            return str(MessagingResponse())

        return str(MessagingResponse())
