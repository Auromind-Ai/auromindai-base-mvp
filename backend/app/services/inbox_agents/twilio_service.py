from twilio.rest import Client
import logging

logger = logging.getLogger(__name__)

class TwilioService:

    def __init__(self, sid, token, from_number):
        self.client = Client(sid, token)
        self.from_number = from_number.replace("whatsapp:", "").strip()

    def send_whatsapp_message(self, to_number: str, body: str):
        try:
            clean_to = to_number.replace("whatsapp:", "").strip()

            logger.info(f"Sending WhatsApp from {self.from_number} to {clean_to}")

            message = self.client.messages.create(
                to=f"whatsapp:{clean_to}",
                from_=f"whatsapp:{self.from_number}",
                body=body
            )

            logger.info(f"Message sent SID: {message.sid}")
            return message.sid

        except Exception as e:
            logger.error(f"Twilio Error: {e}")
            raise 