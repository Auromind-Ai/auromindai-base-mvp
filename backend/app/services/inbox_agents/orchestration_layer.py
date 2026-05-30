from app.core.logger import logger
from app.services.inbox_agents.config_service import ConfigService
from app.services.inbox_agents.unified_agent import UnifiedAgent
from app.services.inbox_agents.mcpservice import MCPService
from app.services.inbox_agents.llm_client import LLMClient
from app.services.inbox_agents.memory_service import MemoryService
from app.services.inbox_agents.escalation_queue import EscalationQueue
from app.services.inbox.twilio_service import TwilioService
from app.models.flow_execution import FlowExecutionState
from app.models import Conversation


class AgentOrchestration:

    def __init__(self, db=None):
        self.logger = logger
        self.logger.info("Initializing AgentOrchestration...")

        self.llm = LLMClient(api_key=settings.GROQ_API_KEY)
        self.db = db

        # Core Services
        self.memory = MemoryService(db) if db else None
        self.mcp = MCPService()
        self.config_service = ConfigService()
        self.mcp.config_service = self.config_service
        self.unified_agent = UnifiedAgent(self.llm, self.memory)
        self.escalation_queue = EscalationQueue(db=db)

        self.channel_adapters = {"twilio": None, "instagram": None, "whatsapp": None}
        self.response_sender = None
        self.runtime_context = {}

        self.logger.info("AgentOrchestration initialized successfully")

    # MAIN ENTRY POINT 
    async def process_message(self, payload, channel, skip_send=False):
        data = self.normalize_message(payload, channel)

        user_id      = data.get("user_id")
        workspace_id = data.get("workspace_id")
        message      = data.get("message", "")
        db           = self.db
        conversation_id = data.get("conversation_id")

        # ── LEAD_DEBUG: Log incoming message at orchestration entry ──
        self.logger.warning(f"[LEAD_DEBUG][orchestration] Incoming message: {message!r}")

        # Note: We no longer extract or generate a user_id-based memory_key.
        # All state is strictly scoped to workspace_id and conversation_id.

        db = getattr(self.escalation_queue, "db", None)
        
        self.logger.info(
            f"[AI DEBUG] Orchestration Layer: workspace_id={workspace_id} "
            f"conversation_id={conversation_id} channel={channel} "
            f"user_id={user_id}"
        )

        if not workspace_id or not conversation_id:
            raise ValueError("workspace_id and conversation_id are required for inbox orchestration")

        self.runtime_context["workspace_id"]    = workspace_id
        self.runtime_context["user_id"]         = user_id
        self.runtime_context["channel"]         = channel
        self.runtime_context["conversation_id"] = conversation_id

        # Turn / repeat counts
        turn_count = self.memory.get_turn_count(
        workspace_id=workspace_id,
        conversation_id=conversation_id,
    ) if self.memory else 0
        repeat_count = 0
        if self.memory and message:
            repeat_count = self.memory.detect_and_track_repeat(
                workspace_id=workspace_id,
                conversation_id=conversation_id,
                message=message,
            )

        # Lead data from memory
        lead = self.memory.get_lead_data(
        workspace_id=workspace_id,
        conversation_id=conversation_id,
    ) if self.memory else None
        # Lead fields from payload (set by flow config)
        lead_fields = payload.get("lead_fields", [])

        state = (
            self.memory.get_conversation_state(
                workspace_id=workspace_id,
                conversation_id=conversation_id,
            ) or {}
        )
        
        if state.get("human_takeover"):
            self.logger.info(
                "[AI_AUTOMATION_PAUSED] Orchestration ignored because human_takeover is active",
                extra={"workspace_id": workspace_id, "conversation_id": conversation_id}
            )
            return {"action": "ignored", "reason": "human_takeover"}

        lead_data = {}
        for field in lead_fields:
            val = ""
            if lead:
                if lead.custom_fields and field in lead.custom_fields:
                    val = lead.custom_fields[field]
                elif hasattr(lead, field):
                    val = getattr(lead, field, "")
            if val:
                lead_data[field] = val

        # ── LEAD_DEBUG: Log lead_data loaded from DB ──
        self.logger.warning(
            f"[LEAD_DEBUG][orchestration] lead_data from DB: {lead_data}"
        )
        self.logger.warning(
            f"[LEAD_DEBUG][orchestration] lead.custom_fields: {lead.custom_fields if lead else None}"
        )

        # Check if all lead fields already collected
        if lead_fields and all(lead_data.get(f) for f in lead_fields):
            if self.memory:
                self.memory.update_conversation_state(
                        workspace_id=workspace_id,
                        conversation_id=conversation_id,
                        data={
                            "current_stage": "sales",
                            "followup_count": 0,
                            "repeat_count": 0,
                            "last_agent": "sales_agent",
                        }
                    )
            state["current_stage"] = "sales"

        # Determine agent
        forced_agent = payload.get("forced_agent")
        if forced_agent:
            agent_type = forced_agent
            self.logger.info(f"FORCED AGENT RAW: {payload.get('forced_agent')}")
            self.logger.info(
                "Using forced agent from automation",
                extra={"agent_type": agent_type, "workspace_id": workspace_id}
            )
        else:
            agent_type = self._determine_agent_type(
                message=message,
                turn_count=turn_count,
                lead_data=lead_data,
                state=state,
                is_followup_trigger=payload.get("is_followup_trigger", False)
            )

        self.logger.info(f"Agent type: {agent_type}", extra={
            "user_id": user_id, "turn_count": turn_count, "conversation_id": conversation_id
        })

        # Run Unified Agent
        result = await self.unified_agent.handle(
            message=message,
            context={
                "agent_type": agent_type,
                "workspace_id": workspace_id,
                "conversation_id": conversation_id,
                "db": self.db,
                "turn_count": turn_count,
                "repeat_count": repeat_count,
                "business_type": payload.get("business_type"),
                "lead_fields": lead_fields,
                "calendar_enabled": payload.get("calendar_enabled", False),
                "payment_enabled": payload.get("payment_enabled", False),
            }
        ) or {}

        stage  = result.get("stage",  "lead")
        action = result.get("action")

        # ─ DEMO BOOKING ─
        if action == "book_demo":
            from app.services.email_automation.calender_executor import CalendarExecutor
            calendar = CalendarExecutor()
            calendar_result = calendar.execute(
                db=db,
                workspace_id=workspace_id,
                action={
                    "data": {
                        "meeting_date": result.get("meeting_date"),
                        "meeting_time": result.get("meeting_time"),
                        "timezone":     result.get("timezone"),
                        "location":     result.get("location", "Online")
                    },
                    "sender": payload.get("from")
                },
                decision={
                    "summary":  "AI Demo Meeting",
                    "priority": "high"
                }
            )
            demo_details = None
            if calendar_result:
                meet_link = calendar_result.get("meet_link")
                if meet_link:
                    result["response"] += f"\n\nGoogle Meet Link:\n{meet_link}"
                else:
                    result["response"] += "\n\nMeeting scheduled successfully."
                demo_details = f"Demo Booked for {result.get('meeting_date')} at {result.get('meeting_time')} ({result.get('timezone')})"
            else:
                result["response"] += "\n\nFailed to schedule meeting automatically. Our team will follow up to manually confirm the schedule."
                demo_details = "Demo Booking Failed (Automatic scheduling failed)"

            # After booking demo, escalate to human
            result["escalate"] = True
            result["close"]    = True
            result["demo_details"] = demo_details

        if action == "lead_complete":
            stage = "sales"
            if self.memory:
                self.memory.update_conversation_state(
                    workspace_id=workspace_id,
                    conversation_id=conversation_id,
                    data={
                        "current_stage": "sales",
                        "followup_count": 0,
                        "repeat_count":   0,
                        "last_agent":     "sales_agent",
                    }
                )
            # Force escalate to human agent after lead is fully collected
            result["escalate"] = True

        confidence = result.get("confidence_score", 0.5)

        # ─ Update memory ─
        if self.memory:
            collected = result.get("collect") or {}

            # ── LEAD_DEBUG: Log raw collect from LLM result ──
            self.logger.warning(
                f"[LEAD_DEBUG][orchestration] RAW collect from LLM: {result.get('collect')}"
            )

            # Merge: also try to extract top-level values for known lead fields
            for field in lead_fields:
                if field in result and result[field] and not collected.get(field):
                    collected[field] = result[field]

            # Merge demo scheduling fields as well so they are persisted to Lead columns/custom_fields
            for field in ["meeting_date", "meeting_time", "timezone"]:
                if field in result and result[field] and not collected.get(field):
                    collected[field] = result[field]

            # ── LEAD_DEBUG: Log merged collected before validation ──
            self.logger.warning(
                f"[LEAD_DEBUG][orchestration] collected BEFORE validation: {collected}"
            )

            INVALID_WORDS = ["none", "null", "no", "nill", "don't have", 
                             "not have", "இல்ல", "தெரியல", "na", "n/a"]

            def validate_lead_fields(data: dict) -> dict:
                import re
                valid = {}
                for field, value in data.items():
                    if not value or not str(value).strip():
                        self.logger.warning(
                            f"[LEAD_DEBUG][validation] SKIP field={field!r}: empty value={value!r}"
                        )
                        continue
                    v = str(value).strip().lower()
                    
                    # Reject invalid words
                    if v in INVALID_WORDS:
                        self.logger.warning(
                            f"[LEAD_DEBUG][validation] REJECT field={field!r}: invalid word={v!r}"
                        )
                        continue
                    
                    # Field-specific rules
                    if field == "email":
                        self.logger.warning(
                            f"[LEAD_DEBUG][validation] EMAIL check: raw value={value!r}, repr={value!r}"
                        )
                        if not re.match(r"[^@]+@[^@]+\.[^@]+", value):
                            self.logger.warning(
                                f"[LEAD_DEBUG][validation] EMAIL REJECTED by regex: {value!r}"
                            )
                            continue
                        else:
                            self.logger.warning(
                                f"[LEAD_DEBUG][validation] EMAIL PASSED regex: {value!r}"
                            )
                    
                    if field == "phone":
                        digits = re.sub(r"\D", "", value)
                        if len(digits) < 10:
                            self.logger.warning(
                                f"[LEAD_DEBUG][validation] PHONE REJECTED: digits={digits!r} len={len(digits)}"
                            )
                            continue
                    
                    if field == "name":
                        if len(value.strip()) < 2:
                            self.logger.warning(
                                f"[LEAD_DEBUG][validation] NAME REJECTED: too short={value!r}"
                            )
                            continue
                    
                    valid[field] = value  

                return valid

            cleaned = validate_lead_fields(
                {k: v for k, v in collected.items() if v}
            )

            # ── LEAD_DEBUG: Log cleaned output after validation ──
            self.logger.warning(
                f"[LEAD_DEBUG][orchestration] cleaned fields AFTER validation: {cleaned}"
            )

            if cleaned:
                # ── LEAD_DEBUG: Log persistence attempt ──
                self.logger.warning(
                    f"[LEAD_DEBUG][orchestration] Persisting fields: {cleaned}"
                )

                self.logger.info(
                    "[LEAD SAVE DEBUG] Before save",
                    extra={
                        "workspace_id": workspace_id,
                        "conversation_id": conversation_id,
                        "collect": cleaned
                    }
                )

                self.memory.update_lead_data(
                    workspace_id=workspace_id,
                    conversation_id=conversation_id,
                    data=cleaned,
                )
                
                # Force a refresh by re-fetching
                lead = self.memory.get_lead_data(
                    workspace_id=workspace_id,
                    conversation_id=conversation_id,
                )
                
                # Re-build lead_data from standard fields and custom_fields
                lead_data = {}
                for field in lead_fields:
                    val = ""
                    if lead:
                        if lead.custom_fields and field in lead.custom_fields:
                            val = lead.custom_fields[field]
                        elif hasattr(lead, field):
                            val = getattr(lead, field, "")
                    if val:
                        lead_data[field] = val
                
                self.logger.info(
                    "[LEAD LOAD DEBUG] After save and reload",
                    extra={
                        "workspace_id": workspace_id,
                        "conversation_id": conversation_id,
                        "lead_fields": lead_data,
                        "custom_fields": lead.custom_fields if lead else None
                    }
                )

                # ── LEAD_DEBUG: Log lead_data after persistence reload ──
                self.logger.warning(
                    f"[LEAD_DEBUG][orchestration] lead_data AFTER persistence: {lead_data}"
                )
                self.logger.warning(
                    f"[LEAD_DEBUG][orchestration] custom_fields AFTER persistence: {lead.custom_fields if lead else None}"
                )

                missing_fields = [
                    field for field in lead_fields
                    if not lead_data.get(field)
                ]
                # All lead fields collected → auto escalate cleanly (only if calendar/demo booking is NOT enabled)
                if lead_fields and not missing_fields and not payload.get("calendar_enabled", False):
                    result["action"] = "lead_complete"
                    result["escalate"] = True
                    result["close"] = True
                    stage = "sales"

                    self.logger.info(
                        "All lead fields collected. Escalating to human.",
                        extra={
                            "workspace_id": workspace_id,
                            "conversation_id": conversation_id,
                            "lead_data": lead_data
                        }
                    )

            else:
                # ── LEAD_DEBUG: Log empty validation failure ──
                self.logger.warning(
                    "[LEAD_DEBUG][orchestration] ⚠️ No fields persisted after validation! "
                    f"collected was: {collected}"
                )

            self.memory.update_conversation_state(
                workspace_id=workspace_id,
                conversation_id=conversation_id,
                data={
                    "current_stage": stage,
                    "last_action":   action,
                }
            )

        # ─ MCP validation ─
        mcp_result = self.mcp.evaluate_action(
            workspace_id=workspace_id,
            action_type=action,
            intent=message,
            context=data,
            confidence=confidence,
            metadata={
                "user_id": user_id,
                "channel": channel,
                "followup_count": state.get("followup_count", 0)
            }
        )

        decision = mcp_result.get("decision")
        state = (
            self.memory.get_conversation_state(
                workspace_id=workspace_id,
                conversation_id=conversation_id,
            ) or {}
        )

        # ─ ESCALATE: end AI session, hand off to human ─
        should_escalate = (
            result.get("escalate")
            or result.get("close")
            or decision == "ESCALATE"
        ) and state.get("current_stage") != "sales"

        # Also escalate if stage is sales and action is lead_complete or book_demo
        if action in ["lead_complete", "book_demo"]:
            should_escalate = True

        if should_escalate:
            self._end_ai_session(conversation_id)
            reason = mcp_result.get("reason", "Lead qualification complete — handoff to human")
            if action == "book_demo" and result.get("demo_details"):
                reason = result["demo_details"]
                
            self.escalation_queue.add({
                "user_id":      user_id,
                "conversation_id": conversation_id,
                "message":      message,
                "channel":      channel,
                "reason":       reason,
                "workspace_id": workspace_id,
            })
            response = {"text": result.get("response", "I'll connect you with our team for better assistance."), "metadata": result}
            if not skip_send:
                self.send_response(channel, user_id, response)
            return response

        if decision == "BLOCK":
            response = {"text": "Sorry, I cannot process this request."}
            if not skip_send:
                self.send_response(channel, user_id, response)
            return response

        response = {"text": result.get("response", "Processing..."), "metadata": result}
        if not skip_send:
            self.send_response(channel, user_id, response)
        return response

    # END AI SESSION
    def _end_ai_session(self, conversation_id):
       
        if not self.db or not conversation_id:
            return
        try:
            state = (
                self.db.query(FlowExecutionState)
                .filter(FlowExecutionState.conversation_id == conversation_id)
                .first()
            )
            if state and state.runtime_context:
                state.runtime_context["active_ai_session"] = False
                state.runtime_context["assigned_agent"]    = None
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(state, "runtime_context")
                self.db.add(state)
                self.db.commit()
        except Exception:
            self.logger.warning("_end_ai_session failed", exc_info=True)

    # AGENT TYPE 
    def _determine_agent_type(self, message, turn_count, lead_data, state, is_followup_trigger=False):
        if is_followup_trigger:
            return "followup_agent"

        if turn_count == 0:
            return "greeting_agent"

        msg_lower = (message or "").strip().lower()

        sales_keywords = [
            "price", "pricing", "cost", "plan", "plans", "package",
            "buy", "purchase", "subscribe", "service", "services",
            "product", "products", "feature", "features", "offer",
            "demo", "trial", "quote", "discount",
        ]
        support_keywords = [
            "issue", "problem", "bug", "error",
            "complaint", "refund", "return", "cancel",
            "privacy", "policy", "broken", "not working",
            "fix", "support", "ticket",
        ]
        closing_keywords = ["thanks", "thank you", "ok thanks", "got it", "perfect"]

        if any(x in msg_lower for x in closing_keywords):
            return "closing_agent"
        if any(kw in msg_lower for kw in sales_keywords):
            return "sales_agent"
        if any(kw in msg_lower for kw in support_keywords):
            return "support_agent"

        required_fields = ["name", "requirement", "contact"]
        if any(not lead_data.get(f) for f in required_fields):
            return "lead_agent"

        return "sales_agent"

    # NORMALIZE MESSAGE 
    def normalize_message(self, payload, channel):
        try:
            user_id         = None
            message         = None
            timestamp       = None
            attachments     = []
            conversation_id = payload.get("conversation_id")

            if channel.lower() in ["whatsapp", "twilio"]:
                user_id   = payload.get("from") or payload.get("WaId") or payload.get("phone")
                message   = payload.get("body") or payload.get("message")
                timestamp = payload.get("timestamp")
                if payload.get("media_url"):
                    attachments.append({"type": "media", "url": payload["media_url"]})

            elif channel.lower() == "instagram":
                user_id = payload.get("sender", {}).get("id")
                msg     = payload.get("message")
                if isinstance(msg, dict):
                    message     = msg.get("text", "")
                    attachments = msg.get("attachments", [])
                else:
                    message = msg or ""
                timestamp = payload.get("timestamp")

            else:
                user_id   = payload.get("user_id") or payload.get("sender_id")
                message   = payload.get("text") or payload.get("message") or payload.get("body")
                timestamp = payload.get("timestamp")

            return {
                "user_id":         user_id,
                "message":         message,
                "channel":         channel,
                "timestamp":       timestamp,
                "attachments":     attachments,
                "raw_payload":     payload,
                "workspace_id":    payload.get("workspace_id"),
                "conversation_id": conversation_id,
            }

        except Exception:
            self.logger.error("normalize_message failed", exc_info=True)
            return {
                "user_id":         None,
                "message":         None,
                "channel":         channel,
                "timestamp":       None,
                "attachments":     [],
                "raw_payload":     payload,
                "workspace_id":    payload.get("workspace_id"),
                "conversation_id": payload.get("conversation_id"),
            }

    # SEND RESPONSE
    def send_response(self, channel, user_id, response):
        from app.services.inbox.message_service import MessageService
        from app.models.message import SenderType, MessageStatus
        from app.models.conversation import Conversation

        try:
            text = (
                response.get("response_text") or response.get("text") or ""
            ) if isinstance(response, dict) else str(response)

            if not text:
                return
            if channel in {"twilio", "whatsapp"} and not user_id:
                raise ValueError("Outbound channel requires a destination user identifier")

            workspace_id    = self.runtime_context.get("workspace_id")
            conversation_id = self.runtime_context.get("conversation_id")
            db = getattr(self.escalation_queue, "db", None)

            if channel in ("twilio", "whatsapp"):
                to_number = user_id if user_id.startswith("whatsapp:") else f"whatsapp:{user_id}"
                TwilioService().send_whatsapp_message(
                    workspace_id=workspace_id,
                    to_number=to_number,
                    body=text,
                )
            elif channel == "instagram":
                if self.response_sender:
                    self.response_sender.send_message(user_id, text)

            if db and conversation_id:
                try:
                    conversation = db.query(Conversation).filter(
                        Conversation.id == conversation_id
                    ).first()

                    if not conversation:
                        conversation = db.query(Conversation).filter(
                            Conversation.phone == conversation_id,
                            Conversation.workspace_id == workspace_id
                        ).first()

                    if conversation:
                        MessageService.save_ai_message(db, conversation, text, source="automation")
                        self.logger.info(f"Automation message saved to inbox: {conversation.id}")
                    else:
                        self.logger.warning(f"Conversation not found: {conversation_id}")

                except Exception as e:
                    self.logger.error(f"Failed to save message to DB: {e}")

        except Exception:
            self.logger.error("send_response failed", exc_info=True)
