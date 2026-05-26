from __future__ import annotations

import logging
from typing import Any

import requests
from sqlalchemy.orm import Session
from twilio.twiml.messaging_response import MessagingResponse

from app.models.conversation import ChannelType
from app.services.conversation_service import ConversationService
from app.services.message_service import MessageService

logger = logging.getLogger(__name__)


class WebhookService:
    @staticmethod
    def verify_meta_subscription(query_params, verify_token: str):
        mode = query_params.get("hub.mode")
        token = query_params.get("hub.verify_token")
        challenge = query_params.get("hub.challenge")
        if mode == "subscribe" and token == verify_token:
            return int(challenge)
        return {"status": "failed"}
        
    @staticmethod
    async def handle_twilio_webhook(form_data, db: Session):
        from_number   = form_data.get("From")
        body          = form_data.get("Body") or form_data.get("ButtonText")
        to_number     = form_data.get("To")
        message_sid   = form_data.get("MessageSid") or form_data.get("SmsSid")
 
        interactive_value = (
            form_data.get("ButtonPayload")
            or form_data.get("ButtonId")
            or form_data.get("InteractiveButtonReplyId")
        )
        interactive_label = (
            form_data.get("ButtonText")
            or form_data.get("InteractiveButtonReplyTitle")
        )
 
        #  Guard: required fields 
        if not from_number or not body or not to_number:
            return str(MessagingResponse())
 
        #  Workspace lookup (To number → Workspace row) 
        workspace = ConversationService.get_workspace_for_twilio_number(db, to_number)
        if not workspace:
            # Log and return empty TwiML — don't crash
            import logging
            logging.getLogger(__name__).error(
                "No workspace found for Twilio number %s", to_number
            )
            return str(MessagingResponse())
 
        workspace_id = str(workspace.id)
 
        #  Forward to unified pipeline
        await WebhookService.process_incoming_message(
            db,
            workspace_id=workspace_id,
            channel=ChannelType.TWILIO,
            body=body,
            #  strip whatsapp: prefix — store plain E.164 in DB
            phone=from_number.replace("whatsapp:", ""),
            message_external_id=message_sid,
            metadata={
                "interactive_value": interactive_value,
                "interactive_label": interactive_label,
                "provider": "twilio",
                "to_number": to_number,
                #   pass workspace_id so orchestration_layer.normalize_message
                #         can read it from payload and store in runtime_context
                "workspace_id": workspace_id,
            },
        )
 
        return str(MessagingResponse())

    @staticmethod
    async def handle_meta_whatsapp_webhook(payload: dict, db: Session):
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                phone_number_id = (value.get("metadata") or {}).get("phone_number_id")
                if not phone_number_id:
                    continue

                workspace = ConversationService.get_workspace_for_meta_whatsapp_phone_number_id(
                    db,
                    phone_number_id,
                )

                for message in value.get("messages") or []:
                    body, interactive_value, interactive_label = WebhookService._extract_meta_whatsapp_body(message)
                    from_number = message.get("from")
                    if not from_number or not body:
                        continue

                    await WebhookService.process_incoming_message(
                        db,
                        workspace_id=str(workspace.id),
                        channel=ChannelType.WHATSAPP,
                        body=body,
                        phone=from_number,
                        message_external_id=message.get("id"),
                        metadata={
                            "interactive_value": interactive_value,
                            "interactive_label": interactive_label,
                            "provider": "meta_whatsapp",
                            "phone_number_id": phone_number_id,
                        },
                    )

        return {"status": "ok"}

    @staticmethod
    async def handle_instagram_webhook(payload: dict, db: Session):
        for entry in payload.get("entry", []):
            instagram_account_id = entry.get("id")
            messaging_events = entry.get("messaging") or []
            if not instagram_account_id or not messaging_events:
                continue

            workspace = ConversationService.get_workspace_for_instagram_account(
                db,
                instagram_account_id,
            )

            for event in messaging_events:
                message_data = event.get("message", {})
                if message_data.get("is_echo"):
                    continue

                sender_id = event.get("sender", {}).get("id")
                text = message_data.get("text")
                message_id = message_data.get("mid")
                if not sender_id or not text:
                    continue

                profile = WebhookService._fetch_instagram_profile(workspace, sender_id)
                await WebhookService.process_incoming_message(
                    db,
                    workspace_id=str(workspace.id),
                    channel=ChannelType.INSTAGRAM,
                    body=text,
                    external_id=sender_id,
                    message_external_id=message_id,
                    contact_name=profile.get("contact_name"),
                    profile_pic=profile.get("profile_pic"),
                    metadata={
                        "provider": "instagram",
                        "instagram_account_id": instagram_account_id,
                    },
                )

        return {"status": "ok"}

    @staticmethod
    async def process_incoming_message(
        db: Session,
        *,
        workspace_id: str,
        channel: ChannelType | str,
        body: str,
        phone: str | None = None,
        external_id: str | None = None,
        message_external_id: str | None = None,
        contact_name: str | None = None,
        profile_pic: str | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        normalized_channel = ConversationService.normalize_channel(channel)
        logger.info("[%s] Processing inbound message", normalized_channel.value)

        try:
            conversation = ConversationService.get_or_create_conversation(
                db,
                workspace_id=workspace_id,
                channel=normalized_channel,
                phone=phone,
                external_id=external_id,
                contact_name=contact_name,
                profile_pic=profile_pic,
            )
            message_metadata = {
                **(metadata or {}),
                "channel": normalized_channel.value,
            }
            _, created = MessageService.persist_inbound_message(
                db,
                conversation=conversation,
                body=body,
                metadata=message_metadata,
                external_id=message_external_id,
            )
            if not created:
                db.rollback()
                logger.info(
                    "[%s] Duplicate inbound message ignored | external_id=%s",
                    normalized_channel.value,
                    message_external_id,
                )
                return {"status": "duplicate"}

            db.commit()
            MessageService.enqueue_incoming_processing(
                str(conversation.id),
                body,
                message_metadata,
            )
            return {"status": "queued", "conversation_id": str(conversation.id)}
        except Exception as exc:
            db.rollback()
            logger.exception("Error processing incoming %s message: %s", normalized_channel.value, exc)
            return {"status": "error"}

    @staticmethod
    def _extract_meta_whatsapp_body(message: dict[str, Any]) -> tuple[str | None, str | None, str | None]:
        text = (message.get("text") or {}).get("body")
        interactive_value = None
        interactive_label = None

        button = message.get("button") or {}
        if button:
            interactive_value = button.get("payload")
            interactive_label = button.get("text")
            text = text or interactive_label

        interactive = message.get("interactive") or {}
        button_reply = interactive.get("button_reply") or {}
        if button_reply:
            interactive_value = button_reply.get("id")
            interactive_label = button_reply.get("title")
            text = text or interactive_label

        return text, interactive_value, interactive_label

    @staticmethod
    def _fetch_instagram_profile(workspace, sender_id: str) -> dict[str, str | None]:
        try:
            response = requests.get(
                f"https://graph.facebook.com/v19.0/{sender_id}",
                params={
                    "fields": "name,username,profile_pic",
                    "access_token": workspace.meta_access_token,
                },
                timeout=10,
            )
            data = response.json()
            return {
                "contact_name": data.get("username") or data.get("name") or sender_id,
                "profile_pic": data.get("profile_pic"),
            }
        except Exception:
            logger.exception("Failed to fetch Instagram profile for sender %s", sender_id)
            return {"contact_name": sender_id, "profile_pic": None}
