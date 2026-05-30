
import logging
from typing import Any, Dict, Optional

from app.models.conversation import ChannelType, Conversation
from app.models.workspace import Workspace
from app.services.inbox_agents.instagram_service import InstagramService
from app.services.inbox_agents.whatsapp import WhatsAppService
from app.services.inbox.twilio_service import TwilioService

logger = logging.getLogger(__name__)


class ChannelService:
    @staticmethod
    def _normalize_whatsapp_number(to_number: str) -> str:
        if to_number.startswith("whatsapp:"):
            return to_number
        return f"whatsapp:{to_number}"

    @staticmethod
    def _render_button_text(body: str, buttons: list[dict]) -> str:
        rendered_body = body.strip() if body and body.strip() else "Please choose an option:"
        button_lines = []
        for index, button in enumerate((buttons or [])[:3], start=1):
            label = button.get("label") or f"Option {index}"
            button_lines.append(f"{index}. {label}")
        if button_lines:
            rendered_body = f"{rendered_body}\n\n" + "\n".join(button_lines)
        return rendered_body

    @staticmethod
    def _get_workspace(conversation: Conversation) -> Workspace:
        workspace = conversation.workspace
        if not workspace:
            raise RuntimeError("Conversation is missing workspace relationship")
        return workspace

    @staticmethod
    def send_message(
        conversation: Conversation,
        body: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        metadata = metadata or {}
        channel = (
            conversation.channel
            if isinstance(conversation.channel, ChannelType)
            else ChannelType[str(conversation.channel).upper()]
        )

        if channel == ChannelType.TWILIO:
            workspace_id = str(conversation.workspace_id) if conversation.workspace_id else None
            if not workspace_id:
                raise RuntimeError("Conversation is missing workspace_id for Twilio send")
            return ChannelService._send_twilio_message(
                workspace_id=workspace_id,
                to_number=conversation.phone or "",
                body=body,
                metadata=metadata,
            )
        if channel == ChannelType.WHATSAPP:
            workspace = ChannelService._get_workspace(conversation)
            return ChannelService._send_meta_whatsapp_message(
                workspace=workspace,
                to_number=conversation.phone or conversation.external_id or "",
                body=body,
                metadata=metadata,
            )
        if channel == ChannelType.INSTAGRAM:
            workspace = ChannelService._get_workspace(conversation)
            return ChannelService._send_instagram_message(
                workspace=workspace,
                recipient_id=conversation.external_id or conversation.phone or "",
                body=body,
                metadata=metadata,
            )
        if channel == ChannelType.WEB:
            logger.info("Skipping external send for WEB conversation %s", conversation.id)
            return None

        raise RuntimeError(f"Unsupported channel: {channel}")

    @staticmethod
    def _send_twilio_message(
        *,
        workspace_id: str,
        to_number: str,
        body: str,
        metadata: Dict[str, Any],
    ) -> Optional[str]:
        media_url = metadata.get("media_url")
        message_type = metadata.get("message_type")
        buttons = (metadata.get("buttons") or [])[:3]
        normalized_to = ChannelService._normalize_whatsapp_number(to_number)

        if media_url and message_type in {"image", "video", "document"}:
            return TwilioService().send_whatsapp_media(
                workspace_id,
                normalized_to,
                media_url,
                caption=body or "",
                message_type=message_type,
                raise_on_error=True,
                metadata=metadata,
            )

        if media_url:
            logger.warning(
                "Twilio media send without explicit message_type; falling back to generic media send"
            )
            return TwilioService().send_whatsapp_media(
                workspace_id,
                normalized_to,
                media_url,
                caption=body or "",
                raise_on_error=True,
                metadata=metadata,
            )

        if buttons:
            return TwilioService().send_whatsapp_buttons(
                workspace_id,
                normalized_to,
                body,           
                buttons,
                raise_on_error=True,
                metadata=metadata,
            )

        return TwilioService().send_whatsapp_message(
            workspace_id,
            normalized_to,
            body,
            raise_on_error=True,
            metadata=metadata,
        )

    @staticmethod
    def _send_meta_whatsapp_message(
        *,
        workspace: Workspace,
        to_number: str,
        body: str,
        metadata: Dict[str, Any],
    ) -> Optional[str]:
        rendered_body = body
        if metadata.get("buttons"):
            rendered_body = ChannelService._render_button_text(body, metadata.get("buttons") or [])
        if metadata.get("media_url"):
            logger.warning(
                "Meta WhatsApp media dispatch is not implemented in ChannelService yet; sending text fallback"
            )
            rendered_body = rendered_body or "Media received"

        service = WhatsAppService(
            access_token=workspace.meta_access_token,
            phone_number_id=workspace.meta_phone_number_id,
        )
        message_id = service.send_text_message(to_number, rendered_body)
        if not message_id:
            raise RuntimeError("Meta WhatsApp send failed")
        return message_id

    @staticmethod
    def _send_instagram_message(
        *,
        workspace: Workspace,
        recipient_id: str,
        body: str,
        metadata: Dict[str, Any],
    ) -> Optional[str]:
        rendered_body = body
        if metadata.get("buttons"):
            rendered_body = ChannelService._render_button_text(body, metadata.get("buttons") or [])
        if metadata.get("media_url"):
            logger.warning(
                "Instagram media dispatch is not implemented in ChannelService yet; sending text fallback"
            )
            rendered_body = rendered_body or "Media received"

        service = InstagramService(
            access_token=workspace.meta_access_token,
            page_id=workspace.meta_business_id,
        )
        response = service.send_message(recipient_id, rendered_body)
        if isinstance(response, dict) and response.get("error"):
            raise RuntimeError(f"Instagram send failed: {response['error']}")
        if isinstance(response, dict):
            message_id = response.get("message_id") or response.get("recipient_id")
            if not message_id:
                raise RuntimeError("Instagram send failed without message id")
            return message_id
        return None
