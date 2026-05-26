import json
import logging
from dataclasses import dataclass

from sqlalchemy.orm import Session
from twilio.rest import Client

from app.database import SessionLocal
from app.models.workspace import Workspace

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TwilioWorkspaceConfig:
    workspace_id: str
    account_sid: str
    auth_token: str
    from_number: str


class TwilioService:
    def _load_workspace_config(self, workspace_id: str) -> TwilioWorkspaceConfig:
        db: Session = SessionLocal()
        try:
            workspace = db.query(Workspace).filter(
                Workspace.id == workspace_id
            ).first()
            if not workspace:
                raise RuntimeError(f"Workspace not found: {workspace_id}")

            sid = workspace.twilio_account_sid
            token = workspace.twilio_auth_token
            from_number = workspace.twilio_phone_number

            if not sid or not token:
                raise RuntimeError(
                    f"Twilio credentials missing in workspace {workspace_id}"
                )
            if not from_number:
                raise RuntimeError(
                    f"Twilio phone number missing in workspace {workspace_id}"
                )

            return TwilioWorkspaceConfig(
                workspace_id=str(workspace_id),
                account_sid=sid,
                auth_token=token,
                from_number=f"whatsapp:{from_number}",
            )
        finally:
            db.close()

    @staticmethod
    def _build_client(config: TwilioWorkspaceConfig) -> Client:
        return Client(config.account_sid, config.auth_token)

    @staticmethod
    def _status_callback_params() -> dict:
        from app.core.config import settings

        url = settings.TWILIO_STATUS_CALLBACK_URL
        return {"status_callback": url} if url else {}

    def send_whatsapp_message(
        self,
        workspace_id: str,
        to_number: str,
        body: str,
        raise_on_error: bool = False,
    ) -> str | None:
        logger.info("TWILIO USING WORKSPACE: %s", workspace_id)
        try:
            config = self._load_workspace_config(workspace_id)
            client = self._build_client(config)
            params = {
                "to": to_number,
                "from_": config.from_number,
                "body": body,
                **self._status_callback_params(),
            }
            logger.info("TWILIO PARAMS: %s", params)
            message = client.messages.create(**params)
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
    ) -> str | None:
        button_lines = [
            f"{i}. {btn.get('label') or f'Option {i}'}"
            for i, btn in enumerate(buttons[:3], start=1)
        ]
        formatted_body = (body.strip() if body else "")
        if button_lines:
            formatted_body += "\n\n" + "\n".join(button_lines)
        return self.send_whatsapp_message(
            workspace_id,
            to_number,
            formatted_body,
            raise_on_error=raise_on_error,
        )

    def send_whatsapp_media(
        self,
        workspace_id: str,
        to_number: str,
        media_url: str,
        caption: str = "",
        message_type: str = "image",
        raise_on_error: bool = False,
    ) -> str | None:
        logger.info("TWILIO USING WORKSPACE: %s", workspace_id)
        try:
            config = self._load_workspace_config(workspace_id)
            client = self._build_client(config)
            params: dict = {
                "to": to_number,
                "from_": config.from_number,
                "media_url": [media_url],
                **self._status_callback_params(),
            }
            if caption:
                params["body"] = caption
            logger.info(
                "Sending WhatsApp %s to %s | media_url=%s",
                message_type,
                to_number,
                media_url,
            )
            message = client.messages.create(**params)
            logger.info("WhatsApp %s sent to %s: %s", message_type, to_number, message.sid)
            return message.sid
        except Exception as exc:
            logger.error(
                "Failed to send WhatsApp %s to %s: %s",
                message_type,
                to_number,
                exc,
            )
            if raise_on_error:
                raise
            return None

    def send_whatsapp_template(
        self,
        workspace_id: str,
        to_number: str,
        content_sid: str,
        content_variables: dict,
        raise_on_error: bool = False,
    ) -> str | None:
        logger.info("TWILIO USING WORKSPACE: %s", workspace_id)
        try:
            config = self._load_workspace_config(workspace_id)
            client = self._build_client(config)
            message = client.messages.create(
                to=to_number,
                from_=config.from_number,
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
