from __future__ import annotations
import logging
from typing import Any, Dict, Optional
from app.models.conversation import ChannelType, Conversation
from app.models.workspace import Workspace
from app.services.inbox_agents.instagram_service import InstagramService
from app.services.inbox_agents.whatsapp import WhatsAppService
from app.services.inbox.twilio_service import TwilioService
from sqlalchemy.orm import object_session
from app.services.wcc_service import WCCService
from app.models.templates import Template

logger = logging.getLogger(__name__)


class ChannelService:
    @staticmethod
    def _normalize_whatsapp_number(to_number: str) -> str:
        if to_number.startswith("whatsapp:"):
            return to_number
        return f"whatsapp:{to_number}"

    @staticmethod
    def _render_button_text(body: str, buttons: list[dict]) -> str:
        rendered_body = body.strip() if body and body.strip() else "Please choose an option:"
        button_lines = []
        for index, button in enumerate((buttons or [])[:3], start=1):
            label = button.get("label") or f"Option {index}"
            button_lines.append(f"{index}. {label}")
        if button_lines:
            rendered_body = f"{rendered_body}\n\n" + "\n".join(button_lines)
        return rendered_body

    @staticmethod
    def _split_instagram_message(text: str, max_length: int = 1000) -> list[str]:
        if not text:
            return [""]
        if len(text) <= max_length:
            return [text]
        
        chunks = []
        paragraphs = text.split("\n")
        current_chunk = ""
        
        for paragraph in paragraphs:
            if len(current_chunk) + len(paragraph) + 1 > max_length:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                
                if len(paragraph) > max_length:
                    p_text = paragraph
                    while len(p_text) > max_length:
                        chunks.append(p_text[:max_length])
                        p_text = p_text[max_length:]
                    current_chunk = p_text
                else:
                    current_chunk = paragraph
            else:
                if current_chunk:
                    current_chunk += "\n" + paragraph
                else:
                    current_chunk = paragraph
                    
        if current_chunk:
            chunks.append(current_chunk.strip())
            
        return chunks

    @staticmethod
    def _get_workspace(conversation: Conversation) -> Workspace:
        workspace = conversation.workspace
        if not workspace:
            raise RuntimeError("Conversation is missing workspace relationship")
        return workspace

    @staticmethod
    def send_message(
        conversation: Conversation,
        body: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        metadata = metadata or {}
        channel = (
            conversation.channel
            if isinstance(conversation.channel, ChannelType)
            else ChannelType[str(conversation.channel).upper()]
        )

        if channel == ChannelType.TWILIO:
            workspace_id = str(conversation.workspace_id) if conversation.workspace_id else None
            if not workspace_id:
                raise RuntimeError("Conversation is missing workspace_id for Twilio send")
            return ChannelService._send_twilio_message(
                workspace_id=workspace_id,
                to_number=conversation.phone or "",
                body=body,
                metadata=metadata,
            )
        if channel == ChannelType.WHATSAPP:
            workspace = ChannelService._get_workspace(conversation)
            return ChannelService._send_meta_whatsapp_message(
                workspace=workspace,
                to_number=conversation.phone or conversation.external_id or "",
                body=body,
                metadata=metadata,
            )
        if channel == ChannelType.INSTAGRAM:
            workspace = ChannelService._get_workspace(conversation)
            return ChannelService._send_instagram_message(
                workspace=workspace,
                recipient_id=conversation.external_id or conversation.phone or "",
                body=body,
                metadata=metadata,
            )
        if channel == ChannelType.WEB:
            logger.info("Skipping external send for WEB conversation %s", conversation.id)
            return None

        raise RuntimeError(f"Unsupported channel: {channel}")

    @staticmethod
    def _send_twilio_message(
        *,
        workspace_id: str,
        to_number: str,
        body: str,
        metadata: Dict[str, Any],
    ) -> Optional[str]:
        media_url = metadata.get("media_url")
        message_type = metadata.get("message_type")
        buttons = (metadata.get("buttons") or [])[:3]
        normalized_to = ChannelService._normalize_whatsapp_number(to_number)

        if media_url and message_type in {"image", "video", "document"}:
            return TwilioService().send_whatsapp_media(
                workspace_id,
                normalized_to,
                media_url,
                caption=body or "",
                message_type=message_type,
                raise_on_error=True,
                metadata=metadata,
            )

        if media_url:
            logger.warning(
                "Twilio media send without explicit message_type; falling back to generic media send"
            )
            return TwilioService().send_whatsapp_media(
                workspace_id,
                normalized_to,
                media_url,
                caption=body or "",
                raise_on_error=True,
                metadata=metadata,
            )

        if buttons:
            return TwilioService().send_whatsapp_buttons(
                workspace_id,
                normalized_to,
                body,           
                buttons,
                raise_on_error=True,
                metadata=metadata,
            )

        return TwilioService().send_whatsapp_message(
            workspace_id,
            normalized_to,
            body,
            raise_on_error=True,
            metadata=metadata,
        )

    @staticmethod
    def _send_meta_whatsapp_message(
        *,
        workspace: Workspace,
        to_number: str,
        body: str,
        metadata: Dict[str, Any],
    ) -> Optional[str]:
        # Pre-flight wallet balance check
      
        db = object_session(workspace)
        is_temp_db = False
        if not db:
            from app.database import SessionLocal
            db = SessionLocal()
            is_temp_db = True

        try:
            category = "service"
            template_name = metadata.get("template_name")
            if template_name:
                template = db.query(Template).filter(
                    Template.name == template_name,
                    Template.workspace_id == workspace.id
                ).first()
                if template and template.category:
                    category = template.category.lower()

            # Centralized pricing logic
            estimate = WCCService.calculate_estimate(
                db=db,
                workspace_id=workspace.id,
                audience_size=1,
                category=category
            )
            # Perform pre-flight check
            WCCService.check_preflight_balance(db, workspace.id, estimate["estimated_cost"])
        finally:
            if is_temp_db:
                db.close()

        service = WhatsAppService(
            access_token=workspace.meta_access_token,
            phone_number_id=workspace.meta_phone_number_id,
        )

        template_name = metadata.get("template_name")
        if template_name:
            components = []
            
            db = object_session(workspace)
            is_temp_db = False
            if not db:
                from app.database import SessionLocal
                db = SessionLocal()
                is_temp_db = True
                
            try:
                template = db.query(Template).filter(
                    Template.name == template_name,
                    Template.workspace_id == workspace.id
                ).first()
            except Exception as e:
                logger.warning(f"Error querying template from DB: {e}")
                template = None
            finally:
                if is_temp_db:
                    db.close()

            if template:
                # 1. Header component mapping
                if template.type in {"IMAGE", "VIDEO", "DOCUMENT"}:
                    media_url = metadata.get("media_url") or metadata.get("header_url")
                    if media_url:
                        param_type = template.type.lower()
                        components.append({
                            "type": "header",
                            "parameters": [
                                {
                                    "type": param_type,
                                    param_type: {"link": media_url}
                                }
                            ]
                        })
                elif template.header and "{{" in template.header:
                    header_vars = metadata.get("header_variables", [])
                    if header_vars:
                        components.append({
                            "type": "header",
                            "parameters": [{"type": "text", "text": str(v)} for v in header_vars]
                        })

                # 2. Body component mapping
                variables = metadata.get("variables", [])
                if variables:
                    components.append({
                        "type": "body",
                        "parameters": [{"type": "text", "text": str(v)} for v in variables],
                    })

                # 3. Button component mapping
                if template.cta and "{{" in template.cta:
                    btn_vars = metadata.get("button_variables", [])
                    if btn_vars:
                        components.append({
                            "type": "button",
                            "sub_type": "url",
                            "index": "0",
                            "parameters": [{"type": "text", "text": str(v)} for v in btn_vars]
                        })
                
                quick_replies = metadata.get("quick_replies", [])
                for idx, qr_payload in enumerate(quick_replies):
                    components.append({
                        "type": "button",
                        "sub_type": "quick_reply",
                        "index": str(idx),
                        "parameters": [{"type": "payload", "payload": str(qr_payload)}]
                    })
            else:
                # Fallback: only map body variables
                variables = metadata.get("variables", [])
                if variables:
                    components.append({
                        "type": "body",
                        "parameters": [{"type": "text", "text": str(v)} for v in variables],
                    })

            message_id = service.send_template(
                to=to_number,
                template_name=template_name,
                language=metadata.get("language", "en_US"),
                components=components
            )
        else:
            rendered_body = body
            if metadata.get("buttons"):
                rendered_body = ChannelService._render_button_text(body, metadata.get("buttons") or [])
            if metadata.get("media_url"):
                logger.warning(
                    "Meta WhatsApp media dispatch is not implemented in ChannelService yet; sending text fallback"
                )
                rendered_body = rendered_body or "Media received"
            message_id = service.send_text_message(to_number, rendered_body)

        if not message_id:
            raise RuntimeError("Meta WhatsApp send failed")
        return message_id

    @staticmethod
    def _send_instagram_message(
        *,
        workspace: Workspace,
        recipient_id: str,
        body: str,
        metadata: Dict[str, Any],
    ) -> Optional[str]:
        rendered_body = body
        if metadata.get("buttons"):
            rendered_body = ChannelService._render_button_text(body, metadata.get("buttons") or [])
        if metadata.get("media_url"):
            logger.warning(
                "Instagram media dispatch is not implemented in ChannelService yet; sending text fallback"
            )
            rendered_body = rendered_body or "Media received"

        service = InstagramService(
            access_token=workspace.meta_access_token,
            page_id=workspace.meta_business_id,
        )
        
        # Instagram character limit is 1000. Split the body into smaller chunks if necessary.
        chunks = ChannelService._split_instagram_message(rendered_body, 1000)
        last_message_id = None
        
        for chunk in chunks:
            response = service.send_message(recipient_id, chunk)
            if isinstance(response, dict) and response.get("error"):
                raise RuntimeError(f"Instagram send failed: {response['error']}")
            if isinstance(response, dict):
                last_message_id = response.get("message_id") or response.get("recipient_id")
                if not last_message_id:
                    raise RuntimeError("Instagram send failed without message id")
        
        return last_message_id
