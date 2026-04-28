import json
import logging
import os
from sqlalchemy.orm import Session
from twilio.rest import Client

from app.database import SessionLocal
from app.services.platform_settings_service import get_setting

logger = logging.getLogger(__name__)


class TwilioService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TwilioService, cls).__new__(cls)
            cls._instance.client = None
            cls._instance._current_sid = None
            cls._instance._current_token = None
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Bootstrap the client on first instantiation."""
        try:
            db: Session = SessionLocal()
            try:
                self._refresh_client(db)
            finally:
                db.close()
        except Exception as exc:
            logger.error("Failed to initialize Twilio client: %s", exc)

    def _refresh_client(self, db: Session):
        """Recreate the client if stored credentials changed."""
        sid = get_setting(db, "twilio_account_sid")
        token = get_setting(db, "twilio_auth_token")
        if not sid or not token:
            logger.warning("Twilio credentials missing in DB")
            self.client = None
            self._current_sid = None
            self._current_token = None
            return

        if sid != self._current_sid or token != self._current_token:
            self.client = Client(sid, token)
            self._current_sid = sid
            self._current_token = token
            logger.info("Twilio client refreshed from DB")

    def _open_db_and_refresh(self) -> Session:
        db: Session = SessionLocal()
        self._refresh_client(db)
        return db

    def reload(self):
        db: Session = SessionLocal()
        try:
            self._refresh_client(db)
        finally:
            db.close()

    def send_whatsapp_template(
        self,
        to_number: str,
        content_sid: str,
        content_variables: dict,
        raise_on_error: bool = False,
    ):
        """Sends a WhatsApp message using a Twilio Content Template."""
        db = self._open_db_and_refresh()
        try:
            if not self.client:
                if raise_on_error:
                    raise RuntimeError("Twilio client is not initialized")
                logger.error("Twilio client is not initialized")
                return None

            from_number = get_setting(db, "twilio_from_number")
            if not from_number:
                if raise_on_error:
                    raise RuntimeError("twilio_from_number is missing in settings")
                logger.error("twilio_from_number is missing in settings")
                return None

            message = self.client.messages.create(
                to=to_number,
                from_=from_number,
                content_sid=content_sid,
                content_variables=json.dumps(content_variables),
            )
            logger.info("WhatsApp template sent to %s: %s", to_number, message.sid)
            return message.sid
        except Exception as exc:
            logger.error("Failed to send WhatsApp template to %s: %s", to_number, exc)
            if raise_on_error:
                raise
            return None
        finally:
            db.close()

    def send_whatsapp_message(self, to_number: str, body: str, raise_on_error: bool = False):
        """Sends a free-form WhatsApp message."""
        db = self._open_db_and_refresh()
        try:
            if not self.client:
                if raise_on_error:
                    raise RuntimeError("Twilio client is not initialized")
                logger.error("Twilio client is not initialized")
                return None

            from_number = get_setting(db, "twilio_from_number")
            if not from_number:
                if raise_on_error:
                    raise RuntimeError("twilio_from_number is missing in settings")
                logger.error("twilio_from_number is missing in settings")
                return None

            import os
            create_kwargs = {
                "to": to_number,
                "from_": from_number,
                "body": body,
            }
            status_callback_url = os.getenv("TWILIO_STATUS_CALLBACK_URL")
            if status_callback_url:
                create_kwargs["status_callback"] = status_callback_url
            logger.info(f"TWILIO PARAMS: {create_kwargs}")
            message = self.client.messages.create(**create_kwargs)
            logger.info("WhatsApp message sent to %s: %s", to_number, message.sid)
            return message.sid
        except Exception as exc:
            logger.error("Failed to send WhatsApp message to %s: %s", to_number, exc)
            if raise_on_error:
                raise
            return None
        finally:
            db.close()

   # twilio_service.py
    def send_whatsapp_buttons(self, to_number: str, body: str, buttons: list[dict], raise_on_error: bool = False):
        button_lines = []
        for index, button in enumerate(buttons[:3], start=1):
            label = button.get("label") or f"Option {index}"
            button_lines.append(f"{index}. {label}")

        formatted_body = body.strip() if body else ""
        if button_lines:
            formatted_body = f"{formatted_body}\n\n" + "\n".join(button_lines)

        return self.send_whatsapp_message(to_number, formatted_body, raise_on_error=raise_on_error)

    
    def send_whatsapp_media(
        self,
        to_number: str,
        media_url: str,
        caption: str = "",
        message_type: str = "image",
        raise_on_error: bool = False,
    ):
        """Sends a WhatsApp message with image/video/document.

        Args:
            message_type: One of "image", "video", "document".
                          Used for logging/tracing — Twilio infers the
                          actual type from the media Content-Type header.
        """
        db = self._open_db_and_refresh()
        try:
            if not self.client:
                if raise_on_error:
                    raise RuntimeError("Twilio client is not initialized")
                return None

            from_number = get_setting(db, "twilio_from_number")
            if not from_number:
                if raise_on_error:
                    raise RuntimeError("twilio_from_number missing")
                return None

            params = {
                "to": to_number,
                "from_": from_number,
                "media_url": [media_url],  # Twilio media parameter
            }
            if caption:
                params["body"] = caption
            status_callback_url = os.getenv("TWILIO_STATUS_CALLBACK_URL")
            if status_callback_url:
                params["status_callback"] = status_callback_url

            logger.info(
                "Sending WhatsApp %s to %s | media_url=%s",
                message_type, to_number, media_url,
            )
            message = self.client.messages.create(**params)
            logger.info(
                "WhatsApp %s sent to %s: %s",
                message_type, to_number, message.sid,
            )
            return message.sid
        except Exception as exc:
            logger.error(
                "Failed to send WhatsApp %s to %s: %s",
                message_type, to_number, exc,
            )
            if raise_on_error:
                raise
            return None
        finally:
            db.close()