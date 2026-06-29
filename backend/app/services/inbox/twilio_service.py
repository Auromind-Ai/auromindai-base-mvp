from __future__ import annotations
import json
import logging
from typing import Optional
from sqlalchemy.orm import Session
from twilio.rest import Client
from app.database import SessionLocal
from app.models.workspace import Workspace

logger = logging.getLogger(__name__)


class TwilioService:
    _instance: "TwilioService | None" = None

    #  Singleton plumbing 
    def __new__(cls) -> "TwilioService":
        if cls._instance is None:
            inst = super().__new__(cls)
            inst.client = None
            inst._current_sid = None
            inst._current_token = None
            inst._from_number = None
            inst._current_workspace_id = None
            cls._instance = inst
        return cls._instance

    #  Internal helpers 
    def _refresh_client(self, db: Session, workspace_id: str) -> None:
        
        workspace = db.query(Workspace).filter(
            Workspace.id == workspace_id
        ).first()

        if not workspace:
            logger.error(f"Workspace not found: {workspace_id}")
            self.client = None
            return

        sid = workspace.twilio_account_sid
        token = workspace.twilio_auth_token
        from_number = workspace.twilio_phone_number

        self._from_number = f"whatsapp:{from_number}" if from_number else None

        if not sid or not token:
            logger.warning(
                "Twilio credentials missing in workspace %s — client disabled",
                workspace_id,
            )
            self.client = None
            return

        # Re-create the client only when credentials actually changed
        if (
            sid != self._current_sid
            or token != self._current_token
            or str(workspace_id) != str(self._current_workspace_id)
        ):
            self.client = Client(sid, token)
            self._current_sid = sid
            self._current_token = token
            self._current_workspace_id = str(workspace_id)
            logger.info(f"Twilio client initialized for workspace {workspace_id}")

    def _ensure_ready(self, workspace_id: str) -> None:
       
        db: Session = SessionLocal()
        try:
            self._refresh_client(db, workspace_id)
        except Exception as exc:
            logger.error("Twilio credential refresh failed for workspace %s: %s", workspace_id, exc)
        finally:
            db.close()

    def _assert_ready(self, raise_on_error: bool) -> bool:
       
        if not self.client:
            msg = "Twilio client is not initialized"
            if raise_on_error:
                raise RuntimeError(msg)
            logger.error(msg)
            return False
        if not self._from_number:
            msg = "twilio_from_number is missing in workspace"
            if raise_on_error:
                raise RuntimeError(msg)
            logger.error(msg)
            return False
        return True

    def _status_callback_params(self, metadata: dict = None) -> dict:
        from app.services.config_service import config_service
        url = config_service.get("twilio_status_callback_url")
        if not url:
            return {}
        
        metadata = metadata or {}
        outbound_message_id = metadata.get("outbound_message_id")
        if outbound_message_id:
            if "?" in url:
                url = f"{url}&outbound_message_id={outbound_message_id}"
            else:
                url = f"{url}?outbound_message_id={outbound_message_id}"
        
        return {"status_callback": url}

    #  Public API 
    def send_whatsapp_message(
        self,
        workspace_id: str,
        to_number: str,
        body: str,
        raise_on_error: bool = False,
        metadata: dict = None,
    ) -> str | None:
        
        logger.info(f"TWILIO USING WORKSPACE: {workspace_id}")
        self._ensure_ready(workspace_id)
        if not self._assert_ready(raise_on_error):
            return None
        try:
            params = {
                "to": to_number,
                "from_": self._from_number,
                "body": body,
                **self._status_callback_params(metadata),
            }
            logger.info("TWILIO PARAMS: %s", params)
            message = self.client.messages.create(**params)
            logger.info("WhatsApp message sent to %s: %s", to_number, message.sid)
            return message.sid
        except Exception as exc:
            logger.error("Failed to send WhatsApp message to %s: %s", to_number, exc)
            if raise_on_error:
                raise
            return None

    def send_whatsapp_buttons(
        self,
        workspace_id: str,
        to_number: str,
        body: str,
        buttons: list[dict],
        raise_on_error: bool = False,
        metadata: dict = None,
    ) -> str | None:
        
        button_lines = [
            f"{i}. {btn.get('label') or f'Option {i}'}"
            for i, btn in enumerate(buttons[:3], start=1)
        ]
        formatted_body = (body.strip() if body else "")
        if button_lines:
            formatted_body += "\n\n" + "\n".join(button_lines)
        return self.send_whatsapp_message(
            workspace_id, to_number, formatted_body, raise_on_error=raise_on_error, metadata=metadata,
        )

    def send_whatsapp_media(
        self,
        workspace_id: str,
        to_number: str,
        media_url: str,
        caption: str = "",
        message_type: str = "image",
        raise_on_error: bool = False,
        metadata: dict = None,
    ) -> str | None:
      
        logger.info(f"TWILIO USING WORKSPACE: {workspace_id}")
        self._ensure_ready(workspace_id)
        if not self._assert_ready(raise_on_error):
            return None
        try:
            params: dict = {
                "to": to_number,
                "from_": self._from_number,
                "media_url": [media_url],
                **self._status_callback_params(metadata),
            }
            if caption:
                params["body"] = caption
            logger.info(
                "Sending WhatsApp %s to %s | media_url=%s",
                message_type, to_number, media_url,
            )
            message = self.client.messages.create(**params)
            logger.info("WhatsApp %s sent to %s: %s", message_type, to_number, message.sid)
            return message.sid
        except Exception as exc:
            logger.error("Failed to send WhatsApp %s to %s: %s", message_type, to_number, exc)
            if raise_on_error:
                raise
            return None

    # def send_whatsapp_template(
    #     self,
    #     workspace_id: str,
    #     to_number: str,
    #     content_sid: str,
    #     content_variables: dict,
    #     raise_on_error: bool = False,
    # ) -> str | None:
        
    #     logger.info(f"TWILIO USING WORKSPACE: {workspace_id}")
    #     self._ensure_ready(workspace_id)
    #     if not self._assert_ready(raise_on_error):
    #         return None
    #     try:
    #         message = self.client.messages.create(
    #             to=to_number,
    #             from_=self._from_number,
    #             content_sid=content_sid,
    #             content_variables=json.dumps(content_variables),
    #         )
    #         logger.info("WhatsApp template sent to %s: %s", to_number, message.sid)
    #         return message.sid
    #     except Exception as exc:
    #         logger.error("Failed to send WhatsApp template to %s: %s", to_number, exc)
    #         if raise_on_error:
    #             raise
    #         return None