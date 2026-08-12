import json
import logging
import requests

logger = logging.getLogger(__name__)


class InstagramService:
    def __init__(self, access_token: str, page_id: str):
        self.access_token = access_token
        self.page_id = page_id or "me"

    def _log_meta_error(self, context: str, response_json: dict) -> None:
        """Parse and log Meta API error response in detail."""
        error = response_json.get("error", {})
        error_code = error.get("code")
        error_type = error.get("type")
        error_message = error.get("message")
        error_subcode = error.get("error_subcode")
        fbtrace_id = error.get("fbtrace_id")

        logger.error(
            "[Instagram API] %s FAILED | "
            "code=%s | subcode=%s | type=%s | "
            "message=%s | fbtrace_id=%s",
            context,
            error_code,
            error_subcode,
            error_type,
            error_message,
            fbtrace_id,
        )

        # Extra guidance based on common Meta error codes
        if error_code == 10:
            logger.error(
                "[Instagram API] code=10 => App does NOT have permission to use this API. "
                "Check that 'instagram_manage_messages' permission is granted and approved."
            )
        elif error_code == 100:
            logger.error(
                "[Instagram API] code=100 => Invalid parameter. "
                "Check payload structure (quick_replies / template format)."
            )
        elif error_code == 190:
            logger.error(
                "[Instagram API] code=190 => Access token is invalid or expired. "
                "Re-connect the Instagram account."
            )
        elif error_code == 200:
            logger.error(
                "[Instagram API] code=200 => Permission denied. "
                "Ensure the page has instagram_manage_messages permission."
            )
        elif error_code == 551:
            logger.error(
                "[Instagram API] code=551 => This message type is not supported "
                "for this recipient. The user may not have messaged the page first."
            )
        elif error_code == 613:
            logger.error(
                "[Instagram API] code=613 => API rate limit exceeded."
            )
        elif error_code == 803:
            logger.error(
                "[Instagram API] code=803 => Some of the aliases you requested do not exist. "
                "Check page_id / ig_id configured in workspace."
            )
        elif error_subcode == 2018022:
            logger.error(
                "[Instagram API] subcode=2018022 => Message outside 24-hour window. "
                "Only RESPONSE type allowed within 24h of user interaction."
            )

    def send_message(self, recipient_id: str, text: str) -> dict:
        url = f"https://graph.facebook.com/v19.0/{self.page_id}/messages"

        payload = {
            "recipient": {"id": recipient_id},
            "messaging_type": "RESPONSE",
            "message": {"text": text}
        }

        params = {
            "access_token": self.access_token
        }

        logger.debug(
            "[Instagram API] Sending plain text message | page_id=%s | recipient=%s | text_len=%d",
            self.page_id,
            recipient_id,
            len(text or ""),
        )

        res = requests.post(url, json=payload, params=params, timeout=10)
        response_json = res.json()

        if response_json.get("error"):
            self._log_meta_error("PLAIN TEXT MESSAGE", response_json)
        else:
            logger.info(
                "[Instagram API] Plain text message sent successfully | "
                "page_id=%s | recipient=%s | message_id=%s",
                self.page_id,
                recipient_id,
                response_json.get("message_id"),
            )

        return response_json

    def send_interactive_buttons(self, recipient_id: str, text: str, buttons: list) -> dict:
        """
        Sends interactive quick reply buttons or generic template buttons to an Instagram recipient.
        """
        url = f"https://graph.facebook.com/v19.0/{self.page_id}/messages"
        params = {"access_token": self.access_token}

        # Check if any button is a URL button
        has_url_button = any(
            isinstance(b, dict) and (b.get("url") or b.get("type") in ("URL", "web_url"))
            for b in buttons
        )

        message_kind = "generic_template" if has_url_button else "quick_replies"

        if has_url_button:
            formatted_buttons = []
            for i, btn in enumerate(buttons[:3]):
                if isinstance(btn, str):
                    formatted_buttons.append({
                        "type": "postback",
                        "title": btn[:20],
                        "payload": btn
                    })
                else:
                    label = btn.get("label") or btn.get("text") or btn.get("title") or f"Option {i+1}"
                    if len(label) > 20:
                        label = label[:17] + "..."

                    if btn.get("url") or btn.get("type") in ("URL", "web_url"):
                        formatted_buttons.append({
                            "type": "web_url",
                            "url": btn.get("url"),
                            "title": label
                        })
                    else:
                        val = btn.get("value") or btn.get("payload") or btn.get("id") or label
                        formatted_buttons.append({
                            "type": "postback",
                            "title": label,
                            "payload": str(val)
                        })

            payload = {
                "recipient": {"id": recipient_id},
                "messaging_type": "RESPONSE",
                "message": {
                    "attachment": {
                        "type": "template",
                        "payload": {
                            "template_type": "generic",
                            "elements": [
                                {
                                    "title": (text or "Choose an option:")[:80],
                                    "buttons": formatted_buttons
                                }
                            ]
                        }
                    }
                }
            }
        else:
            # Send standard Quick Reply buttons
            quick_replies = []
            for i, btn in enumerate(buttons[:13]):
                if isinstance(btn, str):
                    quick_replies.append({
                        "content_type": "text",
                        "title": btn[:20],
                        "payload": btn
                    })
                else:
                    label = btn.get("label") or btn.get("text") or btn.get("title") or f"Option {i+1}"
                    val = btn.get("value") or btn.get("payload") or btn.get("id") or label
                    if len(label) > 20:
                        label = label[:17] + "..."
                    quick_replies.append({
                        "content_type": "text",
                        "title": label,
                        "payload": str(val)
                    })

            payload = {
                "recipient": {"id": recipient_id},
                "messaging_type": "RESPONSE",
                "message": {
                    "text": text or "Choose an option:",
                    "quick_replies": quick_replies
                }
            }

        logger.info(
            "[Instagram API] Sending interactive buttons | kind=%s | page_id=%s | recipient=%s | "
            "button_count=%d | payload=%s",
            message_kind,
            self.page_id,
            recipient_id,
            len(buttons),
            json.dumps(payload, ensure_ascii=False),
        )

        res = requests.post(url, json=payload, params=params, timeout=10)
        response_json = res.json()

        if response_json.get("error"):
            self._log_meta_error(f"INTERACTIVE BUTTONS ({message_kind.upper()})", response_json)
        else:
            logger.info(
                "[Instagram API] Interactive buttons sent successfully | "
                "kind=%s | page_id=%s | recipient=%s | message_id=%s",
                message_kind,
                self.page_id,
                recipient_id,
                response_json.get("message_id"),
            )

        return response_json