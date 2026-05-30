import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class WhatsAppService:

    def __init__(self, access_token: str, phone_number_id: str):
        self.access_token = access_token
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

            response = requests.post(
                self.base_url,
                json=payload,
                headers=self._headers()
            )

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
    # def send_template(
    #     self,
    #     to: str,
    #     template_name: str,
    #     language: str = "en_US",
    #     components: list = None
    # ) -> Optional[str]:
    #     try:
    #         payload = {
    #             "messaging_product": "whatsapp",
    #             "to": to,
    #             "type": "template",
    #             "template": {
    #                 "name": template_name,
    #                 "language": {
    #                     "code": language
    #                 }
    #             }
    #         }

    #         if components:
    #             payload["template"]["components"] = components

    #         response = requests.post(
    #             self.base_url,
    #             json=payload,
    #             headers=self._headers()
    #         )

    #         data = response.json()

    #         if response.status_code != 200:
    #             logger.error(f"Template send error: {data}")
    #             return None

    #         message_id = data.get("messages", [{}])[0].get("id")
    #         logger.info(f"Template sent: {message_id}")

    #         return message_id

    #     except Exception as e:
    #         logger.error(f"Send template failed: {str(e)}")
    #         return None

    # # MARK MESSAGE AS READ
    # def mark_as_read(self, message_id: str):
    #     try:
    #         payload = {
    #             "messaging_product": "whatsapp",
    #             "status": "read",
    #             "message_id": message_id
    #         }

    #         response = requests.post(
    #             self.base_url,
    #             json=payload,
    #             headers=self._headers()
    #         )

    #         if response.status_code != 200:
    #             logger.warning(f"Mark read failed: {response.json()}")

    #     except Exception as e:
    #         logger.error(f"Mark read error: {str(e)}")