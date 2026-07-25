import requests
import logging
import json
from typing import Optional

logger = logging.getLogger(__name__)


class WhatsAppService:

    def __init__(self, access_token: str, phone_number_id: str):
        from app.services.config_service import config_service
        # Meta Embedded Signup strictly requires the Solution Provider's System User Token to send messages.
        self.access_token = config_service.get("meta_system_user_token") or access_token
        self.phone_number_id = phone_number_id
        self.base_url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    # SEND TEXT MESSAGE
    
    def send_text_message(self, to: str, message: str) -> Optional[str]:
        try:
            payload = {
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {
                    "body": message
                }
            }
            # Debug log without token details
            logger.debug(f"Sending WhatsApp text message to: {to}")

            response = requests.post(
                self.base_url,
                json=payload,
                headers=self._headers()
            )

            # Log response status for verification
            logger.debug(f"WhatsApp send response status: {response.status_code}")

            data = response.json()

            if response.status_code != 200:
                logger.error(f"WhatsApp send error: {data}")
                return None

            message_id = data.get("messages", [{}])[0].get("id")
            logger.info(f"WhatsApp message sent: {message_id}")

            return message_id

        except Exception as e:
            logger.error(f"Send message failed: {str(e)}")
            return None

    # SEND TEMPLATE MESSAGE 
    def send_template(
        self,
        to: str,
        template_name: str,
        language: str = "en_US",
        components: list = None
    ) -> Optional[str]:
        try:
            payload = {
                "messaging_product": "whatsapp",
                "to": to,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {
                        "code": language
                    }
                }
            }

            if components:
                payload["template"]["components"] = components

            # Debug log template payload details safely
            logger.debug(f"Sending WhatsApp template message to: {to}, Template: {template_name}")

            response = requests.post(
                self.base_url,
                json=payload,
                headers=self._headers()
            )

            # Log response status for verification
            logger.debug(f"WhatsApp template send response status: {response.status_code}")

            data = response.json()

            if response.status_code != 200:
                logger.error(f"Template send error: {data}")
                return None

            message_id = data.get("messages", [{}])[0].get("id")
            logger.info(f"Template sent: {message_id}")

            return message_id

        except Exception as e:
            logger.error(f"Send template failed: {str(e)}")
            return None

    # MARK MESSAGE AS READ
    def mark_as_read(self, message_id: str):
        try:
            payload = {
                "messaging_product": "whatsapp",
                "status": "read",
                "message_id": message_id
            }

            response = requests.post(
                self.base_url,
                json=payload,
                headers=self._headers()
            )

            if response.status_code != 200:
                logger.warning(f"Mark read failed: {response.json()}")

        except Exception as e:
            logger.error(f"Mark read error: {str(e)}")

    # SEND MEDIA MESSAGE (IMAGE / VIDEO / DOCUMENT / AUDIO)
    def send_media_message(
        self,
        to: str,
        media_url: str,
        media_type: str = "image",
        caption: Optional[str] = None
    ) -> Optional[str]:
        try:
            media_type = media_type.lower()
            if media_type not in {"image", "video", "document", "audio"}:
                media_type = "image"

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": media_type,
                media_type: {
                    "link": media_url
                }
            }

            if caption and media_type in {"image", "video", "document"}:
                payload[media_type]["caption"] = caption

            if media_type == "document":
                import os
                from urllib.parse import urlparse
                filename = os.path.basename(urlparse(media_url).path) or "document"
                payload[media_type]["filename"] = filename

            logger.debug(f"Sending WhatsApp {media_type} message to: {to}")

            response = requests.post(
                self.base_url,
                json=payload,
                headers=self._headers()
            )

            logger.debug(f"WhatsApp send {media_type} response status: {response.status_code}")
            data = response.json()

            if response.status_code != 200:
                logger.error(f"WhatsApp send {media_type} error: {data}")
                return None

            message_id = data.get("messages", [{}])[0].get("id")
            logger.info(f"WhatsApp {media_type} message sent: {message_id}")
            return message_id

        except Exception as e:
            logger.error(f"Send {media_type} failed: {str(e)}")
            return None

    # SEND INTERACTIVE BUTTONS (REPLY BUTTONS - MAX 3) WITH OPTIONAL MEDIA HEADER
    def send_interactive_buttons(
        self,
        to: str,
        text: str,
        buttons: list,
        header_text: Optional[str] = None,
        footer_text: Optional[str] = None,
        media_url: Optional[str] = None,
        media_type: Optional[str] = None,
    ) -> Optional[str]:
        try:
            formatted_buttons = []
            for i, btn in enumerate(buttons[:3]):
                label = btn.get("label") or btn.get("title") or f"Option {i+1}"
                val = btn.get("value") or btn.get("id") or label
                if len(label) > 20:
                    label = label[:17] + "..."
                formatted_buttons.append({
                    "type": "reply",
                    "reply": {
                        "id": val,
                        "title": label
                    }
                })

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "body": {
                        "text": text or "Choose an option below:"
                    },
                    "action": {
                        "buttons": formatted_buttons
                    }
                }
            }

            if media_url and media_type:
                m_type = media_type.lower()
                if m_type in {"image", "video", "document"}:
                    payload["interactive"]["header"] = {
                        "type": m_type,
                        m_type: {
                            "link": media_url
                        }
                    }
            elif header_text:
                payload["interactive"]["header"] = {
                    "type": "text",
                    "text": header_text
                }

            if footer_text:
                payload["interactive"]["footer"] = {
                    "text": footer_text
                }

            logger.debug(f"Sending WhatsApp interactive buttons to: {to}")

            response = requests.post(
                self.base_url,
                json=payload,
                headers=self._headers()
            )

            logger.debug(f"WhatsApp interactive buttons response status: {response.status_code}")
            data = response.json()

            if response.status_code != 200:
                logger.error(f"WhatsApp interactive buttons send error: {data}")
                return None

            message_id = data.get("messages", [{}])[0].get("id")
            logger.info(f"WhatsApp interactive buttons sent: {message_id}")
            return message_id

        except Exception as e:
            logger.error(f"Send interactive buttons failed: {str(e)}")
            return None