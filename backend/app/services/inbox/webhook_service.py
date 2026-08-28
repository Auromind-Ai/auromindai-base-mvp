from __future__ import annotations
import logging
import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID
from app.core.security import to_uuid

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
from app.services.notification_service import NotificationService
from app.models.message import Message, MessageStatus, SenderType
from app.models.outbound_message import OutboundMessage
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

    ws_uuid = to_uuid(workspace_id)
    lead = db.query(Lead).filter(
        Lead.workspace_id == ws_uuid,
        Lead.conversation_id == conversation_id,
    ).first()

    # Get conversation to retrieve contact_name
    from app.models.conversation import Conversation
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    conv_name = conv.contact_name if conv else None

    if not lead:
        lead = Lead(
            workspace_id=ws_uuid,
            conversation_id=conversation_id,
            name=conv_name,
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
        # Emit dynamic lead.created event via EventBus (handles all recipient routing & channels)
        try:
            from app.core.event_bus import emit_event
            emit_event(
                event_name="lead.created",
                payload={
                    "lead_id": str(lead.id),
                    "lead_name": lead.name or lead.phone or "New Lead",
                    "lead_email": getattr(lead, "email", None) or lead.phone or "N/A",
                    "lead_phone": lead.phone or "N/A",
                    "source": (source or "web").upper(),
                    "assigned_agent": getattr(lead, "assigned_to", None) or "Unassigned",
                    "workspace_id": str(ws_uuid) if ws_uuid else None
                },
                workspace_id=ws_uuid,
                idempotency_key=f"lead_created:{lead.id}",
                db=db
            )
        except Exception as evt_exc:
            import logging
            logging.getLogger(__name__).warning(f"Failed to emit lead.created event: {evt_exc}")
    else:
        lead.last_activity_at = datetime.now(timezone.utc)
        if (not lead.name or lead.name == lead.phone) and conv_name and conv_name != lead.phone:
            lead.name = conv_name
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
    def verify_meta_signature(raw_body: bytes, signature_header: str | None, app_secret: str | None) -> bool:
        if not app_secret:
            return True
        if not signature_header or not signature_header.startswith("sha256="):
            return False
        expected_sig = signature_header.split("sha256=", 1)[1].strip()
        import hmac, hashlib
        computed_sig = hmac.new(app_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_sig, computed_sig)

    @staticmethod
    def verify_twilio_signature(url: str, params: dict, signature_header: str | None, auth_token: str | None) -> bool:
        if not auth_token:
            return True
        if not signature_header:
            return False
        try:
            from twilio.request_validator import RequestValidator
            validator = RequestValidator(auth_token)
            return validator.validate(url, params, signature_header)
        except Exception:
            return False

        
    @staticmethod
    async def handle_twilio_webhook(form_data, db: Session):
        from_number   = form_data.get("From")
        body          = form_data.get("Body") or form_data.get("ButtonText")
        to_number     = form_data.get("To")
        account_sid   = form_data.get("AccountSid")
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

        #  Workspace lookup (To number / AccountSid → Workspace row) 
        workspace = ConversationService.get_workspace_for_twilio_number(db, to_number, account_sid=account_sid)
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
        print("\n[DEBUG WEBHOOK] WebhookService.handle_meta_whatsapp_webhook started")
        logger.info("Starting WebhookService.handle_meta_whatsapp_webhook")
        for entry in payload.get("entry", []):
            entry_id = entry.get('id')
            print(f"[DEBUG WEBHOOK] Processing entry: {entry_id}")
            logger.info(f"Processing entry: {entry_id}")
            for change in entry.get("changes", []):
                field = change.get("field")
                value = change.get("value", {})
                print(f"[DEBUG WEBHOOK] Processing change field: {field}")
                logger.info(f"Processing change field: {field}, value keys: {list(value.keys())}")
                
                if field == "message_template_status_update":
                    tpl_name = value.get("message_template_name")
                    tpl_lang = value.get("message_template_language")
                    tpl_event = value.get("event")
                    tpl_id = value.get("message_template_id")
                    print(f"[DEBUG WEBHOOK] Template Status Update: {tpl_name} -> {tpl_event}")
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
                            print(f"[DEBUG WEBHOOK] Updating template {template.id} status to {new_status}")
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
                print(f"[DEBUG WEBHOOK] Metadata: {metadata}")
                print(f"[DEBUG WEBHOOK] Phone Number ID: {phone_number_id}")
                
                if not phone_number_id:
                    print("[DEBUG WEBHOOK] No phone_number_id found. Skipping change.")
                    logger.warning("No phone_number_id found in webhook change value. Skipping.")
                    continue

                print(f"[DEBUG WEBHOOK] Looking up workspace for phone_number_id: {phone_number_id}")
                logger.info(f"Looking up workspace for phone_number_id: {phone_number_id}")
                workspace = ConversationService.get_workspace_for_meta_whatsapp_phone_number_id(
                    db,
                    phone_number_id,
                )
                
                if not workspace:
                    print(f"[DEBUG WEBHOOK] ERROR: No workspace found for phone_number_id: {phone_number_id}!")
                    logger.error(f"No workspace found attached to phone_number_id: {phone_number_id}. Message dropped.")
                    continue
                
                print(f"[DEBUG WEBHOOK] Workspace found: {workspace.id} (Name: {workspace.name})")
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
                        
                    STATUS_RANK = {
                        "pending": 0,
                        "queued": 10,
                        "sending": 20,
                        "dispatched": 30,
                        "sent": 40,
                        "delivered": 50,
                        "read": 60,
                        "failed": 70,
                        "cancelled": 70,
                    }
                    for status_update in statuses:
                        wamid = status_update.get("id")
                        status_str = status_update.get("status")
                        if wamid and status_str:
                          
                            
                            status_mapping = {
                                "sent": MessageStatus.SENT,
                                "delivered": MessageStatus.DELIVERED,
                                "read": MessageStatus.DELIVERED,
                                "failed": MessageStatus.FAILED
                            }
                            mapped_status = status_mapping.get(status_str.lower())
                            outbound = None
                            try:
                                msg = db.query(Message).filter(Message.external_id == wamid).first()
                                if msg and mapped_status:
                                    # Never demote an already DELIVERED message back to SENT
                                    if not (msg.status == MessageStatus.DELIVERED and mapped_status == MessageStatus.SENT):
                                        msg.status = mapped_status
                                        db.flush()
                                        logger.info(f"Updated message status for {wamid} to {status_str}")

                                outbound = db.query(OutboundMessage).filter(OutboundMessage.twilio_sid == wamid).first()
                                if outbound:
                                    current_rank = STATUS_RANK.get(str(outbound.status).lower(), 0)
                                    new_rank = STATUS_RANK.get(status_str.lower(), 0)
                                    # Only advance status forward, NEVER demote delivered/read back to sent!
                                    if new_rank >= current_rank or status_str.lower() in ("failed", "cancelled"):
                                        outbound.status = status_str.lower()
                                        db.flush()
                                        logger.info(f"Updated OutboundMessage status for {wamid} to {status_str}")
                                    else:
                                        logger.info(f"Ignored out-of-order status update for {wamid}: current={outbound.status}, received={status_str}")
                            except Exception as exc:
                                logger.error(f"Failed to update message status for {wamid}: {exc}")

                            # WCC Wallet Debit Integration — Strictly for Flow messages, NEVER for user <-> agent conversations
                            is_flow_message = False
                            if outbound and (outbound.flow_id is not None or outbound.message_type == "automation"):
                                is_flow_message = True
                            elif outbound and outbound.metadata_json:
                                meta_j = outbound.metadata_json
                                if isinstance(meta_j, str):
                                    try:
                                        meta_j = json.loads(meta_j)
                                    except Exception:
                                        meta_j = {}
                                if isinstance(meta_j, dict) and (
                                    meta_j.get("flow_id")
                                    or meta_j.get("is_flow")
                                    or meta_j.get("source") in ("flow", "workflow", "broadcast", "campaign", "automation")
                                ):
                                    is_flow_message = True

                            if not is_flow_message and msg:
                                if msg.source in ("flow", "workflow", "broadcast", "campaign", "automation"):
                                    is_flow_message = True
                                elif msg.metadata_json:
                                    try:
                                        msg_meta = json.loads(msg.metadata_json) if isinstance(msg.metadata_json, str) else msg.metadata_json
                                        if isinstance(msg_meta, dict) and (
                                            msg_meta.get("flow_id")
                                            or msg_meta.get("is_flow")
                                            or msg_meta.get("source") in ("flow", "workflow", "broadcast", "campaign", "automation")
                                        ):
                                            is_flow_message = True
                                    except Exception:
                                        pass

                            # Explicit guard: Agent manual replies and user messages MUST NEVER be debited
                            if msg and (msg.sender_type == SenderType.AGENT or msg.source == "manual_reply"):
                                is_flow_message = False

                            pricing = status_update.get("pricing")
                            conversation = status_update.get("conversation")

                            if not is_flow_message:
                                logger.info(
                                    f"[WCC Billing] Skipping WCC wallet debit for user/agent conversation message wamid={wamid}"
                                )
                            elif pricing and conversation:
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

                                # Trigger next queued message on delivered/read/failed
                                if status_str.lower() in ("delivered", "read", "failed") and (outbound or msg):
                                    conv_id = str(outbound.conversation_id if outbound else msg.conversation_id)
                                    try:
                                        from app.workers.flow_execution import send_next_pending_message
                                        send_next_pending_message.apply_async(
                                            args=[conv_id],
                                            countdown=0,
                                        )
                                    except Exception as dispatch_exc:
                                        logger.warning(
                                            "Meta DLR dispatcher trigger failed (non-fatal): %s",
                                            dispatch_exc,
                                        )

                            except Exception as commit_exc:
                                db.rollback()
                                logger.error(f"Failed to commit database updates for status {wamid}: {commit_exc}")

                contacts = value.get("contacts") or []
                contact_name = None
                if contacts and isinstance(contacts, list) and len(contacts) > 0:
                    profile = contacts[0].get("profile") or {}
                    contact_name = profile.get("name")

                messages = value.get("messages") or []
                if not messages:
                    logger.info("No 'messages' array in payload (might be a status update). Skipping message processing.")
                
                for message in messages:
                    logger.info(f"Processing message ID: {message.get('id')}")
                    (body,interactive_value,interactive_label,media_url,media_type,mime_type, media_id) = WebhookService._extract_meta_whatsapp_body(message)
                    from_number = message.get("from")
                    
                    if not from_number:
                        logger.warning("Message has no 'from' number. Skipping.")
                        continue
                    if not body:
                        logger.warning(f"Message has no textual body (unsupported media type?). Skipping. Raw message: {message}")
                        continue

                    if media_id and workspace:
                        try:
                            from app.routers.inbox_chennal.conversations import create_media_token
                            token = create_media_token(media_id=str(media_id), workspace_id=str(workspace.id))
                            media_url = f"/api/inbox/media/meta/{media_id}?token={token}"
                        except Exception as token_err:
                            logger.error(f"Failed to generate media token: {token_err}")

                    logger.info(f"Forwarding message from {from_number} to unified pipeline...")
                    try:
                        result = await WebhookService.process_incoming_message(
                            db,
                            workspace_id=str(workspace.id),
                            channel=ChannelType.WHATSAPP,
                            body=body,
                            phone=from_number,
                            message_external_id=message.get("id"),
                            contact_name=contact_name,
                           metadata={
                                        "interactive_value": interactive_value,
                                        "interactive_label": interactive_label,
                                        "provider": "meta_whatsapp",
                                        "phone_number_id": phone_number_id,
                                        "media_url": media_url,
                                        "media_type": media_type,
                                        "mime_type": mime_type,
                                        "media_id": media_id   
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
                workspace_id=to_uuid(workspace_id)
            ).first()
            if conv_state:
                conv_state.human_takeover = False

            # When a customer replies, resolve any prior in-flight/sent outbound messages in this conversation
            from app.models.outbound_message import OutboundMessage
            db.query(OutboundMessage).filter(
                OutboundMessage.conversation_id == conversation.id,
                OutboundMessage.status.in_(["sent", "dispatched", "delivered"])
            ).update({"status": "read"}, synchronize_session=False)

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

            # Emit lead.message_received event
            try:
                from app.core.event_bus import emit_event
                ws_id_uuid = to_uuid(workspace_id)
                emit_event(
                    event_name="lead.message_received",
                    payload={
                        "lead_id": str(lead.id) if lead else None,
                        "lead_name": (lead.name if lead else None) or contact_name or phone or "Lead",
                        "lead_phone": phone or (lead.phone if lead else "N/A"),
                        "message_body": body[:500] if body else "",
                        "channel": normalized_channel.value,
                        "workspace_id": str(workspace_id)
                    },
                    workspace_id=ws_id_uuid,
                    idempotency_key=f"lead_msg:{message.id}",
                    db=db
                )
            except Exception as msg_evt_exc:
                logger.warning(f"Failed to emit lead.message_received event: {msg_evt_exc}")

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
    def _extract_meta_whatsapp_body(
            message: dict[str, Any]
        ) -> tuple[
            str | None,
            str | None,
            str | None,
            str | None,
            str | None,
            str | None,
            str | None,
        ]:
            text = (message.get("text") or {}).get("body")

            interactive_value = None
            interactive_label = None

            media_url = None
            media_type = None
            mime_type = None
            media_id = None

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

            msg_type = (message.get("type") or "").lower()

            if msg_type in {"image", "audio", "voice", "video"}:
                media = message.get(msg_type) or {}

                # WhatsApp voice notes normally arrive as type="audio"
                if msg_type == "voice":
                    media = message.get("audio") or media

                media_id = media.get("id")
                mime_type = media.get("mime_type")
                caption = media.get("caption")

                if media_id:
                    media_type = (
                        "audio"
                        if msg_type in {"audio", "voice"}
                        else msg_type
                    )

                   
                    media_url = None
                    text = caption or f"[{media_type.upper()}]"

            if not text:
                if msg_type in [
                    "video",
                    "document",
                    "sticker",
                    "location",
                    "contacts",
                ]:
                    text = f"[{msg_type.upper()}]"
                elif msg_type:
                    text = f"[{msg_type.upper()} message]"

            return (
                text,
                interactive_value,
                interactive_label,
                media_url,
                media_type,
                mime_type,
                media_id,
            )

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
