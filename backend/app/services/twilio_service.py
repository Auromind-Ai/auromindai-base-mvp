from twilio.rest import Client
import json
import logging
from sqlalchemy.orm import Session
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

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _initialize(self):
        """Bootstrap the client on first instantiation."""
        try:
            db: Session = SessionLocal()
            try:
                self._refresh_client(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Failed to initialize Twilio client: {e}")

    def _refresh_client(self, db: Session):
        """
        (Re-)create the Twilio client if credentials have changed.
        Uses get_setting() — fetches only what's needed.
        """
        sid   = get_setting(db, "twilio_account_sid")
        token = get_setting(db, "twilio_auth_token")
        print("TwilioService _refresh_client called")
        print("Fetched SID:", sid)     
        if not sid or not token:
            logger.warning("Twilio credentials missing in DB ❌")
            self.client = None
            self._current_sid = None
            self._current_token = None
            return

        # Only rebuild if credentials actually changed
        if sid != self._current_sid or token != self._current_token:
            self.client = Client(sid, token)
            self._current_sid = sid
            self._current_token = token
            logger.info("Twilio client (re-)initialized from DB ✅")

    def _open_db_and_refresh(self) -> Session:
        """
        Opens a DB session, refreshes client if credentials changed,
        and returns the session. Caller is responsible for closing it.
        """
        db: Session = SessionLocal()
        self._refresh_client(db)
        return db

    def reload(self):
        """
        Public hook — call after update_settings() so the singleton
        immediately picks up new Twilio credentials.
        """
        db: Session = SessionLocal()
        try:
            self._refresh_client(db)
        finally:
            db.close()

    # ------------------------------------------------------------------
    # Public send methods
    # ------------------------------------------------------------------

    def send_whatsapp_template(
        self,
        to_number: str,
        content_sid: str,
        content_variables: dict,
    ):
        """Sends a WhatsApp message using a Twilio Content Template."""
        db = self._open_db_and_refresh()
        try:
            if not self.client:
                logger.error("Twilio client is not initialized ❌")
                return None

            from_number = get_setting(db, "twilio_from_number")
            if not from_number:
                logger.error("twilio_from_number is missing in settings ❌")
                return None

            message = self.client.messages.create(
                to=to_number,
                from_=from_number,
                content_sid=content_sid,
                content_variables=json.dumps(content_variables),
            )
            logger.info(f"WhatsApp template sent to {to_number}: {message.sid} ✅")
            return message.sid

        except Exception as e:
            logger.error(f"Failed to send WhatsApp template to {to_number}: {e}")
            return None
        finally:
            db.close()

    def send_whatsapp_message(self, to_number: str, body: str):
        """Sends a free-form WhatsApp message."""
        db = self._open_db_and_refresh()
        try:
            if not self.client:
                logger.error("Twilio client is not initialized ❌")
                return None

            from_number = get_setting(db, "twilio_from_number")
            if not from_number:
                logger.error("twilio_from_number is missing in settings ❌")
                return None

            message = self.client.messages.create(
                to=to_number,
                from_=from_number,
                body=body,
            )
            logger.info(f"WhatsApp message sent to {to_number}: {message.sid} ✅")
            return message.sid

        except Exception as e:
            logger.error(f"Failed to send WhatsApp message to {to_number}: {e}")
            return None
        finally:
            db.close()
