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
    """Dispatch a single outbound WhatsApp message via Twilio.

    Routing logic:
      1. Media messages  — routed by ``message_type`` (image / video / document)
      2. Button messages — rendered as numbered text options
      3. Plain text      — standard free-form message
    """
    metadata = metadata or {}
    media_url = metadata.get("media_url")
    message_type = metadata.get("message_type")  # image | video | document
    buttons = (metadata.get("buttons") or [])[:3]

    # ── Media message (type-aware) ─────────────────────────────────────────
    if media_url and message_type in {"image", "video", "document"}:
        logger.info(
            "[deliver_whatsapp_message] Sending %s media | to=%s url=%s",
            message_type,
            to_number,
            media_url,
        )
        sid = TwilioService().send_whatsapp_media(
            to_number,
            media_url,
            caption=body or "",
            message_type=message_type,
            raise_on_error=True,
        )
        return sid

    # ── Legacy media fallback (media_url present but no message_type) ──────
    if media_url:
        logger.info(
            "[deliver_whatsapp_message] Sending media (untyped) | to=%s url=%s",
            to_number,
            media_url,
        )
        sid = TwilioService().send_whatsapp_media(
            to_number,
            media_url,
            caption=body or "",
            raise_on_error=True,
        )
        return sid

    # ── Button message ─────────────────────────────────────────────────────
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

    # ── Plain text ─────────────────────────────────────────────────────────
    sid = TwilioService().send_whatsapp_message(
        to_number,
        body,
        raise_on_error=True,
    )
    logger.info("[deliver_whatsapp_message] Sent text message | to=%s", to_number)
    return sid
