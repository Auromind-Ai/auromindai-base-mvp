
from app.core.logger import logger
from app.core.config import settings
from app.services.inbox_agents.config_service import ConfigService
from app.services.inbox_agents.unified_agent import UnifiedAgent
from app.services.inbox_agents.mcpservice import MCPService
from app.services.inbox_agents.llm_client import LLMClient
from app.services.inbox_agents.memory_service import MemoryService
from app.services.inbox_agents.escalation_queue import EscalationQueue
from app.services.twilio_service import TwilioService
import os

class AgentOrchestration:

    def __init__(self, db=None):
        self.logger = logger
        self.logger.info("Initializing AgentOrchestration...")

        self.llm = LLMClient(api_key=settings.GROQ_API_KEY)
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


    # ── MAIN ENTRY POINT 

    async def process_message(self, payload, channel):
        data = self.normalize_message(payload, channel)

        user_id      = data.get("user_id")       
        workspace_id = data.get("workspace_id")
        message = data.get("message", "")
        db = self.db
        memory_key = data.get("conversation_id") or user_id

        db = getattr(self.escalation_queue, "db", None)

        self.runtime_context["workspace_id"]    = workspace_id
        self.runtime_context["user_id"]         = user_id
        self.runtime_context["channel"]         = channel
        self.runtime_context["memory_key"]      = memory_key

        # turn / repeat counts
        turn_count   = self.memory.get_turn_count(memory_key) if self.memory else 0
        repeat_count = 0
        if self.memory and message:
            repeat_count = self.memory.detect_and_track_repeat(memory_key, message)

        # lead data
        lead = self.memory.get_lead_data(memory_key) if self.memory else None
        lead_data = {
            "name":        getattr(lead, "name",        "") or "",
            "requirement": getattr(lead, "requirement", "") or "",
            "budget":      getattr(lead, "budget",      "") or "",
            "timeline":    getattr(lead, "timeline",    "") or "",
            "contact":     getattr(lead, "contact",     "") or "",
        } if lead else {}

        state = self.memory.get_conversation_state(memory_key) or {}

        if all([lead_data.get("name"), lead_data.get("requirement"), lead_data.get("contact")]):
            if self.memory:
                self.memory.update_conversation_state(memory_key, {"current_stage": "sales"})
            state["current_stage"] = "sales"


        agent_type = self._determine_agent_type(
            message=message,
            turn_count=turn_count,
            lead_data=lead_data,
            state=state,
            is_followup_trigger=payload.get("is_followup_trigger", False)
        )

        self.logger.info(f"Agent type: {agent_type}", extra={
            "user_id": user_id, "turn_count": turn_count, "memory_key": memory_key
        })

        # Pre-agent policy check
        # policy = ConversationPolicy(self.memory, self.config_service)
        # current_stage = state.get("current_stage", "lead")

        # policy_result = policy.evaluate(
        #     user_id=user_id,
        #     stage=current_stage,
        #     lead_data=lead_data
        # ) or {}

        # if policy_result and policy_result.get("action") == "ESCALATE":
        #     if current_stage != "sales":
        #         self.escalation_queue.add({
        #             "user_id": user_id,
        #             "message": message,
        #             "channel": channel,
        #             "reason": policy_result.get("reason"),
        #             "workspace_id": workspace_id
        #         })

        #         response = {"text": "I'll connect you with our team for better assistance."}
        #         self.send_response(channel, user_id, response)
        #         return response
        
        # if policy_result.get("action") == "CLOSE":
            
        #     force_close = True
        # else:
        #     force_close = False

        # ── Unified Agent ─────────
        result = await self.unified_agent.handle(
            message=message,
            context={
                "user_id":      memory_key,
                "workspace_id": workspace_id,
                "db":           db,
                "agent_type":   agent_type,
                "turn_count":   turn_count,
                "repeat_count": repeat_count,
            }
        ) or {}

        # if force_close:
        #     result["response"] = "Thanks for the details! Our team will contact you shortly."
        #     result["close"] = True
        #     result["action"] = "lead_complete"

        stage  = result.get("stage",  "lead")
        action = result.get("action", "unknown")

        if action == "lead_complete":
            stage = "sales"
            if self.memory:
                self.memory.update_conversation_state(memory_key, {
                    "current_stage": "sales",
                    "followup_count": 0,
                    "repeat_count":   0,
                    "last_agent":     "sales_agent",
                })

        confidence = result.get("confidence_score", 0.5)

        # ── Update memory ─────────
        if self.memory:
            if result.get("collect"):
                cleaned = {k: v for k, v in result["collect"].items() if v}
                if cleaned:
                    self.memory.update_lead_data(memory_key, cleaned)
            self.memory.update_conversation_state(memory_key, {
                "current_stage": stage,
                "last_action":   action,
            })

        # ── MCP validation ────────

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
        state    = self.memory.get_conversation_state(memory_key) or {}

        if (result.get("escalate") or decision == "ESCALATE") \
                and state.get("current_stage") != "sales":
            self.escalation_queue.add({
                "user_id":      memory_key,
                "message":      message,
                "channel":      channel,
                "reason":       mcp_result.get("reason", "Escalated by AI"),
                "workspace_id": workspace_id,
            })
            response = {"text": "I'll connect you with our team for better assistance."}
            self.send_response(channel, user_id, response)
            return response

        if decision == "BLOCK":
            response = {"text": "Sorry, I cannot process this request."}
            self.send_response(channel, user_id, response)
            return response

        response = {"text": result.get("response", "Processing..."), "metadata": result}
        self.send_response(channel, user_id, response)
        return response


    # ── AGENT TYPE ────────────────

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


    # ── NORMALIZE MESSAGE ─────────

    def normalize_message(self, payload, channel):
        try:
            user_id         = None
            message         = None
            timestamp       = None
            attachments     = []
            conversation_id = payload.get("conversation_id")

            if channel.lower() in ["whatsapp", "twilio"]:
                #  Bug #9 fix — "from" is phone number set by webhook/task caller
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
                user_id   = payload.get("user_id") or payload.get("sender_id") or payload.get("from")
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


    # ── SEND RESPONSE ─────────────

    def send_response(self, channel, user_id, response):
        try:
            text = (
                response.get("response_text") or response.get("text") or ""
            ) if isinstance(response, dict) else str(response)

            if not text:
                return

            workspace_id = self.runtime_context.get("workspace_id")
            conversation_id = self.runtime_context.get("memory_key")
            db = getattr(self.escalation_queue, "db", None)

          
            if channel == "twilio":
                to_number = user_id if user_id.startswith("whatsapp:") else f"whatsapp:{user_id}"
                TwilioService().send_whatsapp_message(
                    workspace_id=workspace_id,
                    to_number=to_number,
                    body=text,
                )

            elif channel == "whatsapp":
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
                    from app.services.message_service import MessageService
                    from app.services.conversation_service import ConversationService
                    from app.models.message import SenderType, MessageStatus
                    from app.models.conversation import Conversation

                   
                    conversation = (
                        db.query(Conversation)
                        .filter(
                            Conversation.id == conversation_id  # UUID match
                        ).first()
                    )

                   
                    if not conversation:
                        workspace_id = self.runtime_context.get("workspace_id")
                        conversation = (
                            db.query(Conversation)
                            .filter(
                                Conversation.phone == conversation_id,
                                Conversation.workspace_id == workspace_id
                            ).first()
                        )

                    if conversation:
                        MessageService.save_manual_message(
                            db,
                            conversation=conversation,
                            body=text,
                            sender_type=SenderType.AI,
                            status=MessageStatus.SENT,
                            source="automation",
                        )
                        self.logger.info(f"Automation message saved to inbox: {conversation.id}")
                    else:
                        self.logger.warning(f"Conversation not found for id/phone: {conversation_id}")

                except Exception as e:
                    self.logger.error(f"Failed to save automation message to DB: {e}")

        except Exception:
            self.logger.error("send_response failed", exc_info=True)