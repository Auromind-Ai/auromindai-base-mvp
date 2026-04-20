import logging
from typing import Any, Dict, Optional

from app.services.twilio_service import TwilioService

logger = logging.getLogger(__name__)


def deliver_whatsapp_message(
    *,
    to_number: str,
    body: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    metadata = metadata or {}
    buttons = (metadata.get("buttons") or [])[:3]

    if metadata.get("media_url"):
        sid = TwilioService().send_whatsapp_media(
            to_number,
            metadata["media_url"],
            body,
            raise_on_error=True,
        )
        logger.info(
            "[deliver_whatsapp_message] Sent media | to=%s media_url=%s",
            to_number,
            metadata["media_url"],
        )
        return sid

    if buttons:
        rendered_body = body.strip() if body and body.strip() else "Please choose an option:"
        sid = TwilioService().send_whatsapp_buttons(
            to_number,
            rendered_body,
            buttons,
            raise_on_error=True,
        )
        logger.info(
            "[deliver_whatsapp_message] Sent button message | to=%s buttons_count=%d",
            to_number,
            len(buttons) if buttons else 0
        )
        return sid

    sid = TwilioService().send_whatsapp_message(
        to_number,
        body,
        raise_on_error=True,
    )
    logger.info("[deliver_whatsapp_message] Sent text message | to=%s", to_number)
    return sid
