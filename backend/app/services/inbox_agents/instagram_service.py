import logging
import requests

logger = logging.getLogger(__name__)


class InstagramService:
    def __init__(self, access_token: str, page_id: str):
        self.access_token = access_token
        self.page_id = page_id

    def send_message(self, recipient_id: str, text: str) -> dict:
        url = f"https://graph.facebook.com/v19.0/{self.page_id}/messages"

        payload = {
            "recipient": {"id": recipient_id},
            "message": {"text": text}
        }

        params = {
            "access_token": self.access_token
        }

        res = requests.post(url, json=payload, params=params, timeout=10)

        return res.json()

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
                "message": {
                    "text": text or "Choose an option:",
                    "quick_replies": quick_replies
                }
            }

        res = requests.post(url, json=payload, params=params, timeout=10)
        return res.json()