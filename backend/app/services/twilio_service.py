from twilio.rest import Client
import os
import json
import logging

logger = logging.getLogger(__name__)

class TwilioService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TwilioService, cls).__new__(cls)
            cls._instance.client = None
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        try:
            sid = os.getenv("TWILIO_ACCOUNT_SID")
            token = os.getenv("TWILIO_AUTH_TOKEN")
            if sid and token and token != "[AuthToken]":
                self.client = Client(sid, token)
                logger.info("Twilio Client Initialized")
            else:
                logger.warning("Twilio credentials missing or invalid")
        except Exception as e:
            logger.error(f"Failed to initialize Twilio client: {e}")

    def send_whatsapp_template(self, to_number: str, content_sid: str, content_variables: dict):
        """
        Sends a WhatsApp message using a Twilio Content Template.
        """
        if not self.client:
            logger.error("Twilio client is not initialized")
            return None

        from_number = os.getenv("TWILIO_FROM_NUMBER")
        if not from_number:
            logger.error("TWILIO_FROM_NUMBER is missing")
            return None

        try:
            # content_variables needs to be a JSON string if using legal Twilio python client < 8.x, 
            # but for newer ones it might be a dict. The curl example passed it as a stringified JSON.
            # The python library expects `content_variables` as a JSON string usually.
            
            variables_json = json.dumps(content_variables)

            message = self.client.messages.create(
                to=to_number,
                from_=from_number,
                content_sid=content_sid,
                content_variables=variables_json
            )
            
            logger.info(f"WhatsApp message sent to {to_number}: {message.sid}")
            return message.sid
        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {e}")
            return None

    def send_whatsapp_message(self, to_number: str, body: str):
        """
        Sends a free-form WhatsApp message.
        """
        if not self.client:
            logger.error("Twilio client is not initialized")
            return None

        from_number = os.getenv("TWILIO_FROM_NUMBER")
        if not from_number:
            logger.error("TWILIO_FROM_NUMBER is missing")
            return None

        try:
            message = self.client.messages.create(
                to=to_number,
                from_=from_number,
                body=body
            )
            
            logger.info(f"WhatsApp message sent to {to_number}: {message.sid}")
            return message.sid
        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {e}")
            return None
