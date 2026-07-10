from __future__ import annotations
import logging
import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID


from app.models.ai_action import Lead
from app.models.templates import Template
from app.models.workspace import Workspace
import requests
from sqlalchemy.orm import Session
from twilio.twiml.messaging_response import MessagingResponse
from app.models.conversation import ChannelType
from app.services.inbox.conversation_service import ConversationService
from app.services.inbox.message_service import MessageService
from app.utils.intent_detection import detect_intent_signals
from app.services.crm.lead_scoring_service import recalculate_lead_score
from app.workers.scoring_worker import analyze_message_intent
from decimal import Decimal
from app.services.wcc_service import WCCService
from app.models.wcc import WCCRateCard
from app.core.logger import logger


# ─
# FIX 1: Auto-create / update Lead on every inbound message
# ─
def _derive_source(metadata: dict[str, Any] | None) -> str:
    """Map webhook metadata → lead source label."""
    provider = (metadata or {}).get("provider", "")
    mapping = {
        "meta_whatsapp": "whatsapp",
        "twilio": "twilio",
        "instagram": "instagram",
    }
    return mapping.get(provider, provider or "unknown")


def upsert_lead(
    workspace_id: str | UUID,
    conversation_id: UUID,
    phone: str | None,
    source: str,
    db: Session,
) -> Lead:
    """Get or create a Lead for this conversation."""
    lead = db.query(Lead).filter(
        Lead.workspace_id == str(workspace_id),
        Lead.conversation_id == conversation_id,
    ).first()

    if not lead:
        lead = Lead(
            workspace_id=str(workspace_id),
            conversation_id=conversation_id,
            phone=phone,
            source=source,
            status="new",
            score=0,
            current_node=0,
            total_nodes=0,
            semantic_intent_score=0,
            last_activity_at=datetime.now(timezone.utc),
        )
        db.add(lead)
        db.flush()

        try:
            from app.services.notification_service import NotificationService
            NotificationService.notify_workspace(
                db=db,
                workspace_id=workspace_id,
                type="lead_alert",
                title="New Lead Captured",
                message=f"A new lead was captured via {source.upper()} (Phone: {phone or 'N/A'})"
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send lead alert notification: {e}")
    else:
        lead.last_activity_at = datetime.now(timezone.utc)
        db.flush()

    return lead


class WebhookService:
    @staticmethod
    def verify_meta_subscription(query_params, verify_token: str):
        mode = query_params.get("hub.mode")
        token = query_params.get("hub.verify_token")
        challenge = query_params.get("hub.challenge")
        if mode == "subscribe" and token == verify_token:
            return challenge
        return None
        
    @staticmethod
    async def handle_twilio_webhook(form_data, db: Session):
        from_number   = form_data.get("From")
        body          = form_data.get("Body") or form_data.get("ButtonText")
        to_number     = form_data.get("To")
        message_sid   = form_data.get("MessageSid") or form_data.get("SmsSid")
 
        interactive_value = (
            form_data.get("ButtonPayload")
            or form_data.get("ButtonId")
            or form_data.get("InteractiveButtonReplyId")
        )
        interactive_label = (
            form_data.get("ButtonText")
            or form_data.get("InteractiveButtonReplyTitle")
        )
 
        #  Guard: required fields 
        if not from_number or not body or not to_number:
            return str(MessagingResponse())
 
        #  Workspace lookup (To number → Workspace row) 
        workspace = ConversationService.get_workspace_for_twilio_number(db, to_number)
        if not workspace:
            # Log and return empty TwiML — don't crash
            import logging
            logging.getLogger(__name__).error(
                "No workspace found for Twilio number %s", to_number
            )
            return str(MessagingResponse())
 
        workspace_id = str(workspace.id)
 
        #  Forward to unified pipeline
        await WebhookService.process_incoming_message(
            db,
            workspace_id=workspace_id,
            channel=ChannelType.TWILIO,
            body=body,
            phone=from_number.replace("whatsapp:", ""),
            message_external_id=message_sid,
            metadata={
                "interactive_value": interactive_value,
                "interactive_label": interactive_label,
                "provider": "twilio",
                "to_number": to_number,
                "workspace_id": workspace_id,
            },
        )
 
        return str(MessagingResponse())

    @staticmethod
    async def handle_meta_whatsapp_webhook(payload: dict, db: Session):
        logger.info("Starting WebhookService.handle_meta_whatsapp_webhook")
        for entry in payload.get("entry", []):
            logger.info(f"Processing entry: {entry.get('id')}")
            for change in entry.get("changes", []):
                field = change.get("field")
                value = change.get("value", {})
                logger.info(f"Processing change field: {field}, value keys: {list(value.keys())}")
                
                if field == "message_template_status_update":
                    tpl_name = value.get("message_template_name")
                    tpl_lang = value.get("message_template_language")
                    tpl_event = value.get("event")
                    tpl_id = value.get("message_template_id")
                    logger.info(f"Template status update webhook hit: {tpl_name} ({tpl_lang}) -> {tpl_event}")
                    
                    waba_id = entry.get("id")
                    workspace = None
                    if waba_id:
                        workspace = db.query(Workspace).filter(Workspace.meta_waba_id == str(waba_id)).first()
                        
                    template = None
                    if tpl_id:
                        query = db.query(Template).filter(Template.meta_template_id == str(tpl_id))
                        if workspace:
                            query = query.filter(Template.workspace_id == workspace.id)
                        template = query.first()
                        
                    if not template and tpl_name:
                        query = db.query(Template).filter(
                            Template.name == tpl_name,
                            Template.language == tpl_lang
                        )
                        if workspace:
                            query = query.filter(Template.workspace_id == workspace.id)
                        template = query.first()
                        
                    if template:
                        if tpl_event:
                            new_status = tpl_event.lower()
                            logger.info(f"Updating template {template.id} status to {new_status}")
                            template.status = new_status
                            db.commit()
                        else:
                            logger.warning("Template status update had no 'event' status value.")
                    else:
                        logger.warning(f"No template found in DB for name: {tpl_name}, lang: {tpl_lang}, id: {tpl_id}")
                    continue
                
                # In WhatsApp Cloud API, incoming messages usually have 'metadata' with 'phone_number_id'
                metadata = value.get("metadata") or {}
                phone_number_id = metadata.get("phone_number_id")
                
                if not phone_number_id:
                    logger.warning("No phone_number_id found in webhook change value. Skipping.")
                    continue

                logger.info(f"Looking up workspace for phone_number_id: {phone_number_id}")
                workspace = ConversationService.get_workspace_for_meta_whatsapp_phone_number_id(
                    db,
                    phone_number_id,
                )
                
                if not workspace:
                    logger.error(f"No workspace found attached to phone_number_id: {phone_number_id}. Message dropped.")
                    continue
                
                logger.info(f"Found workspace: {workspace.id}")

                statuses = value.get("statuses") or []
                if statuses:
                    print("WHATSAPP STATUS UPDATE")
                    print(json.dumps(payload, indent=2))
                    
                    # Pre-fetch and cache active rate cards for region 'IN' to eliminate N+1 queries
                    active_cards = {}
                    try:
                        from datetime import datetime, timezone
                        now = datetime.now(timezone.utc)
                        rates = db.query(WCCRateCard).filter(
                            WCCRateCard.is_active == True,
                            WCCRateCard.effective_from <= now,
                            (WCCRateCard.effective_to == None) | (WCCRateCard.effective_to > now)
                        ).all()
                        for r in rates:
                            active_cards[(r.category.lower(), r.region.upper())] = r
                    except Exception as rates_exc:
                        logger.error(f"Failed to pre-fetch WCC rate cards in webhook: {rates_exc}")
                        
                    for status_update in statuses:
                        wamid = status_update.get("id")
                        status_str = status_update.get("status")
                        if wamid and status_str:
                            from app.models.message import Message, MessageStatus
                            
                            status_mapping = {
                                "sent": MessageStatus.SENT,
                                "delivered": MessageStatus.DELIVERED,
                                "read": MessageStatus.DELIVERED,
                                "failed": MessageStatus.FAILED
                            }
                            mapped_status = status_mapping.get(status_str.lower())
                            if mapped_status:
                                try:
                                    msg = db.query(Message).filter(Message.external_id == wamid).first()
                                    if msg:
                                        msg.status = mapped_status
                                        db.flush()
                                        logger.info(f"Updated message status for {wamid} to {status_str}")
                                except Exception as exc:
                                    logger.error(f"Failed to update message status for {wamid}: {exc}")

                            # WCC Wallet Debit Integration
                            pricing = status_update.get("pricing")
                            conversation = status_update.get("conversation")
                            if pricing and conversation:
                                try:
                                    billable = pricing.get("billable", False)
                                    category = pricing.get("category", "service").lower()
                                    meta_session_id = conversation.get("id")
                                    
                                    meta_cost = Decimal("0.00")
                                    customer_price = Decimal("0.00")
                                    if billable:
                                        # Retrieve from pre-fetched cache
                                        rate_card = active_cards.get((category, "IN"))
                                        if rate_card:
                                            meta_cost = rate_card.meta_cost
                                            customer_price = rate_card.customer_price
                                        else:
                                            # Fallback query
                                            try:
                                                rate_card = WCCService.get_active_rate(db, category, "IN")
                                                meta_cost = rate_card.meta_cost
                                                customer_price = rate_card.customer_price
                                            except Exception as rate_err:
                                                logger.warning(f"No active WCC rate card found for category '{category}' during webhook debit: {rate_err}")
                                                # Absolute safety fallbacks based on Meta expected charges if not configured
                                                fallbacks = {
                                                    "marketing": (Decimal("1.09"), Decimal("1.25")),
                                                    "utility": (Decimal("0.145"), Decimal("0.18")),
                                                    "authentication": (Decimal("0.145"), Decimal("0.18")),
                                                    "service": (Decimal("0.00"), Decimal("0.05"))
                                                }
                                                meta_cost, customer_price = fallbacks.get(category, (Decimal("0.00"), Decimal("0.05")))

                                    # Perform the atomic debit using reseller prices
                                    WCCService.debit_conversation_charge(
                                        db=db,
                                        workspace_id=workspace.id,
                                        meta_session_id=meta_session_id,
                                        category=category,
                                        meta_cost=meta_cost,
                                        customer_price=customer_price,
                                        raw_payload=status_update
                                    )
                                except Exception as debit_exc:
                                    logger.error(f"Error debiting WCC wallet for workspace {workspace.id}: {debit_exc}")

                            # Perform a single database commit at the end of processing this status update
                            try:
                                db.commit()
                            except Exception as commit_exc:
                                db.rollback()
                                logger.error(f"Failed to commit database updates for status {wamid}: {commit_exc}")

                messages = value.get("messages") or []
                if not messages:
                    logger.info("No 'messages' array in payload (might be a status update). Skipping message processing.")
                
                for message in messages:
                    logger.info(f"Processing message ID: {message.get('id')}")
                    body, interactive_value, interactive_label = WebhookService._extract_meta_whatsapp_body(message)
                    from_number = message.get("from")
                    
                    if not from_number:
                        logger.warning("Message has no 'from' number. Skipping.")
                        continue
                    if not body:
                        logger.warning(f"Message has no textual body (unsupported media type?). Skipping. Raw message: {message}")
                        continue

                    logger.info(f"Forwarding message from {from_number} to unified pipeline...")
                    try:
                        result = await WebhookService.process_incoming_message(
                            db,
                            workspace_id=str(workspace.id),
                            channel=ChannelType.WHATSAPP,
                            body=body,
                            phone=from_number,
                            message_external_id=message.get("id"),
                            metadata={
                                "interactive_value": interactive_value,
                                "interactive_label": interactive_label,
                                "provider": "meta_whatsapp",
                                "phone_number_id": phone_number_id,
                            },
                        )
                        logger.info(f"Pipeline processing result: {result}")
                    except Exception as e:
                        logger.exception(f"Exception during process_incoming_message: {e}")

        return {"status": "ok"}

    @staticmethod
    async def handle_instagram_webhook(payload: dict, db: Session):
       
        for entry in payload.get("entry", []):
            instagram_account_id = entry.get("id")
            messaging_events = entry.get("messaging") or []
            if not instagram_account_id or not messaging_events:
                continue

            workspace = ConversationService.get_workspace_for_instagram_account(
                db,
                instagram_account_id,
            )
            
            if not workspace:
                logger.error(f"No workspace found for Instagram account {instagram_account_id}. Skipping.")
                continue

            for event in messaging_events:
                message_data = event.get("message", {})
                postback_data = event.get("postback", {})
                sender_id = event.get("sender", {}).get("id")

                # Echo Protection: Ignore any message originating from the page itself
                if message_data.get("is_echo") or (sender_id and sender_id == instagram_account_id):
                    continue
                
                # Extract text and button payload
                text = message_data.get("text")
                message_id = message_data.get("mid")
                
                interactive_value = None
                interactive_label = None

                # Handle quick replies
                quick_reply = message_data.get("quick_reply", {})
                if quick_reply:
                    interactive_value = quick_reply.get("payload")
                    text = text or interactive_value

                # Handle postbacks (button clicks)
                if postback_data:
                    interactive_value = postback_data.get("payload")
                    interactive_label = postback_data.get("title")
                    text = text or interactive_label or interactive_value
                    message_id = message_id or postback_data.get("mid")

                if not sender_id or not text:
                    continue

                profile = WebhookService._fetch_instagram_profile(workspace, sender_id)
                await WebhookService.process_incoming_message(
                    db,
                    workspace_id=str(workspace.id),
                    channel=ChannelType.INSTAGRAM,
                    body=text,
                    external_id=sender_id,
                    message_external_id=message_id,
                    contact_name=profile.get("contact_name"),
                    profile_pic=profile.get("profile_pic"),
                    metadata={
                        "provider": "instagram",
                        "instagram_account_id": instagram_account_id,
                        "interactive_value": interactive_value,
                        "interactive_label": interactive_label,
                    },
                )

        return {"status": "ok"}

    @staticmethod
    async def process_incoming_message(
        db: Session,
        *,
        workspace_id: str,
        channel: ChannelType | str,
        body: str,
        phone: str | None = None,
        external_id: str | None = None,
        message_external_id: str | None = None,
        contact_name: str | None = None,
        profile_pic: str | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        normalized_channel = ConversationService.normalize_channel(channel)
        logger.info("[%s] Processing inbound message", normalized_channel.value)

        try:
            #  Step 1: Get or create conversation 
            conversation = ConversationService.get_or_create_conversation(
                db,
                workspace_id=workspace_id,
                channel=normalized_channel,
                phone=phone,
                external_id=external_id,
                contact_name=contact_name,
                profile_pic=profile_pic,
            )
            
            # Reopen conversation and reset human takeover on new user inbound message
            from app.models.conversation import ConversationStatus
            from app.models.ai_action import ConversationState
            if conversation.status != ConversationStatus.OPEN:
                conversation.status = ConversationStatus.OPEN
                
            conv_state = db.query(ConversationState).filter_by(
                conversation_id=conversation.id,
                workspace_id=workspace_id
            ).first()
            if conv_state:
                conv_state.human_takeover = False

            #  Step 2: FIX 1 — Auto upsert lead 
            source = _derive_source(metadata)
            lead = upsert_lead(
                workspace_id=workspace_id,
                conversation_id=conversation.id,
                phone=phone or external_id,
                source=source,
                db=db,
            )

            #  Step 3: Save inbound message 
            message_metadata = {
                **(metadata or {}),
                "channel": normalized_channel.value,
            }
            message, created = MessageService.persist_inbound_message(
                db,
                conversation=conversation,
                body=body,
                metadata=message_metadata,
                external_id=message_external_id,
            )
            if not created:
                db.rollback()
                logger.info(
                    "[%s] Duplicate inbound message ignored | external_id=%s",
                    normalized_channel.value,
                    message_external_id,
                )
                return {"status": "duplicate"}

            db.commit()

            # Inject message identifiers for downstream idempotency & billing keys
            message_metadata["message_id"] = str(message.id)
            if message_external_id:
                message_metadata["message_external_id"] = message_external_id

            #  Step 4: FIX 2 — Async Intent detection + score (inbound only) 
            analyze_message_intent.delay(str(conversation.id), body, message_external_id)

            #  Step 5: Enqueue bot reply processing 
            MessageService.enqueue_incoming_processing(
                str(conversation.id),
                body,
                message_metadata,
            )
            return {"status": "queued", "conversation_id": str(conversation.id)}
        except Exception as exc:
            db.rollback()
            logger.exception("Error processing incoming %s message: %s", normalized_channel.value, exc)
            return {"status": "error"}

    @staticmethod
    def _extract_meta_whatsapp_body(message: dict[str, Any]) -> tuple[str | None, str | None, str | None]:
        text = (message.get("text") or {}).get("body")
        interactive_value = None
        interactive_label = None

        button = message.get("button") or {}
        if button:
            interactive_value = button.get("payload")
            interactive_label = button.get("text")
            text = text or interactive_label

        interactive = message.get("interactive") or {}
        button_reply = interactive.get("button_reply") or {}
        if button_reply:
            interactive_value = button_reply.get("id")
            interactive_label = button_reply.get("title")
            text = text or interactive_label

        if not text:
            msg_type = message.get("type")
            if msg_type in ["image", "audio", "video", "document", "sticker", "location", "contacts"]:
                text = f"[{msg_type.upper()}]"
            elif msg_type:
                text = f"[{msg_type.upper()} message]"

        return text, interactive_value, interactive_label

    @staticmethod
    def _fetch_instagram_profile(workspace, sender_id: str) -> dict[str, str | None]:
        try:
            response = requests.get(
                f"https://graph.facebook.com/v19.0/{sender_id}",
                params={
                    "fields": "name,username,profile_pic",
                    "access_token": workspace.meta_access_token,
                },
                timeout=10,
            )
            data = response.json()
            return {
                "contact_name": data.get("username") or data.get("name") or sender_id,
                "profile_pic": data.get("profile_pic"),
            }
        except Exception:
            logger.exception("Failed to fetch Instagram profile for sender %s", sender_id)
            return {"contact_name": sender_id, "profile_pic": None}
