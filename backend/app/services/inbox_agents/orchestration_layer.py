from app.core.logger import logger
from app.services.inbox_agents.config_service import ConfigService
from app.services.inbox_agents.unified_agent import UnifiedAgent
from app.services.inbox_agents.mcpservice import MCPService
from app.services.inbox_agents.llm_client import LLMClient
from app.services.inbox_agents.memory_service import MemoryService
import os
from app.services.inbox_agents.conversation_policy import ConversationPolicy
from app.services.inbox_agents.escalation_queue import EscalationQueue

class AgentOrchestration:

    def __init__(self, db=None):

        self.logger = logger
        self.logger.info("Initializing AgentOrchestration...")
        self.db = db
        
        #Core Services
        self.llm = LLMClient(api_key=os.getenv("GROQ_API_KEY"))
        self.memory = MemoryService(db) if db else None
        self.mcp = MCPService()
        self.config_service = ConfigService()
        self.mcp.config_service = self.config_service
        self.unified_agent = UnifiedAgent(self.llm, self.memory)
        self.escalation_queue = EscalationQueue(self.db)

        self.channel_adapters = {}
        self.response_sender = None

        self.channel_adapters = {
            "twilio": None,
            "instagram": None,
            "whatsapp": None
        }

        self.logger.info("Core dependencies initialized")

        # Runtime state
        self.runtime_context = {}

        self.logger.info("AgentOrchestration initialized successfully")

    
    # MAIN ENTRY POINT
    async def process_message(self, payload, channel):

        data = self.normalize_message(payload, channel)
        user_id = data.get("user_id")
        workspace_id = data.get("workspace_id")
        message = data.get("message", "")
        db = self.db

        # turn_count
        turn_count = self.memory.get_turn_count(user_id) if self.memory else 0

        # repeat_count
        repeat_count = 0
        if self.memory and message:
            repeat_count = self.memory.detect_and_track_repeat(user_id, message)

        #Fetch lead data
        lead = self.memory.get_lead_data(user_id) if self.memory else None
        lead_data = {
            "name": getattr(lead, "name", "") or "",
            "requirement": getattr(lead, "requirement", "") or "",
            "budget": getattr(lead, "budget", "") or "",
            "timeline": getattr(lead, "timeline", "") or "",
            "contact": getattr(lead, "contact", "") or ""
        } if lead else {}

        state = self.memory.get_conversation_state(user_id) or {}

        if all([
            lead_data.get("name"),
            lead_data.get("requirement"),
            lead_data.get("contact")
        ]):
            # REAL UPDATE (DB)
            if self.memory:
                self.memory.update_conversation_state(user_id, {
                    "current_stage": "sales"
                })

            state["current_stage"] = "sales" 

        #Determine agent_type 
        agent_type = self._determine_agent_type(
            message=message,
            turn_count=turn_count,
            lead_data=lead_data,
            state=state,
            is_followup_trigger=payload.get("is_followup_trigger", False)
        )

        self.logger.info(f"Agent type determined: {agent_type}", extra={
            "user_id": user_id,
            "turn_count": turn_count,
            "repeat_count": repeat_count
        })

        # Pre-agent policy check
        policy = ConversationPolicy(self.memory, self.config_service)
        current_stage = state.get("current_stage", "lead")

        policy_result = policy.evaluate(
            user_id=user_id,
            stage=current_stage,
            lead_data=lead_data
        ) or {}

        if policy_result and policy_result.get("action") == "ESCALATE":
            if current_stage != "sales":
                self.escalation_queue.add({
                    "user_id": user_id,
                    "message": message,
                    "channel": channel,
                    "reason": policy_result.get("reason"),
                    "workspace_id": workspace_id
                })

                response = {"text": "I'll connect you with our team for better assistance."}
                self.send_response(channel, user_id, response)
                return response
        
        if policy_result.get("action") == "CLOSE":
            
            force_close = True
        else:
            force_close = False

        #Execute Unified Agent
        result = await self.unified_agent.handle(
            message=message,
            context={
                "user_id": user_id,
                "workspace_id": workspace_id,
                "db": db,
                "agent_type": agent_type,
                "turn_count": turn_count,
                "repeat_count": repeat_count
            }
        )or {}

        if force_close:
            result["response"] = "Thanks for the details! Our team will contact you shortly."
            result["close"] = True
            result["action"] = "lead_complete"

        stage = result.get("stage", "lead")
        action = result.get("action", "unknown")

        if action == "lead_complete":
            stage = "sales"

            # RESET STATE 
            if self.memory:
                self.memory.update_conversation_state(user_id, {
                    "current_stage": "sales",
                    "followup_count": 0,
                    "repeat_count": 0,
                    "last_agent": "sales_agent"
                })

        confidence = result.get("confidence_score", 0.5)

        # Update Memory
        if self.memory:
            if result.get("collect"):
                cleaned_collect = {k: v for k, v in result.get("collect").items() if v}
                if cleaned_collect:
                    self.memory.update_lead_data(user_id, cleaned_collect)

            self.memory.update_conversation_state(user_id, {
                "current_stage": stage,
                "last_action": action
            })

        #MCP validation
        mcp_result = self.mcp.evaluate_action(
            workspace_id=workspace_id,
            action_type=action,
            intent=stage,
            context=data,
            confidence=confidence,
            metadata={
                "user_id": user_id,
                "channel": channel
            }
        )

        self.logger.info(f"MCP Result: {mcp_result}")

        decision = mcp_result.get("decision")

        state = self.memory.get_conversation_state(user_id) or {}

        if (result.get("escalate") or decision == "ESCALATE") \
                and state.get("current_stage") != "sales":

            self.escalation_queue.add({
                "user_id": user_id,
                "message": message,
                "channel": channel,
                "reason": mcp_result.get("reason", "Escalated by AI workflow"),
                "workspace_id": workspace_id
            })

            response = {"text": "I'll connect you with our team for better assistance."}
            self.send_response(channel, user_id, response)
            return response

        if decision == "BLOCK":
            response = {"text": "Sorry, I cannot process this request."}
            self.send_response(channel, user_id, response)
            return response

        if result.get("close") and action != "lead_complete":
            self.logger.info("Conversation marked to close", extra={"user_id": user_id})

        response = {
            "text": result.get("response", "Processing..."),
            "metadata": result
        }

        # Send response
        self.send_response(channel, user_id, response)

        return response


    # AGENT TYPE DETERMINATION
    def _determine_agent_type(self, message, turn_count, lead_data, state, is_followup_trigger=False):
       
        # Followup scheduler trigger
        if is_followup_trigger:
            return "followup_agent"

        msg_lower = (message or "").strip().lower()

        # Sales intent keywords
        sales_keywords = [
            "price", "pricing", "cost", "plan", "plans", "package",
            "buy", "purchase", "subscribe", "service", "services",
            "product", "products", "feature", "features", "offer",
            "demo", "trial", "quote", "discount"
        ]

        # Support intent keywords
        support_keywords = [
            "issue", "problem", "bug", "error", "help",
            "complaint", "refund", "return", "cancel",
            "privacy", "policy", "broken", "not working",
            "fix", "support", "ticket"
        ]

        msg_lower = (message or "").strip().lower()

        # THANKS HANDLING
        if any(x in msg_lower for x in ["thanks", "thank you", "ok thanks", "ok", "cool", "fine"]):
            return "closing_agent"

        # sales intent
        if any(kw in msg_lower for kw in sales_keywords):
            return "sales_agent"

        # support intent
        if any(kw in msg_lower for kw in support_keywords):
            return "support_agent"

        # If lead data is still incomplete → lead_agent
        required_fields = ["name", "requirement", "contact"]
        missing = [f for f in required_fields if not lead_data.get(f)]
        if missing:
            return "lead_agent"

        # fallback
        return "sales_agent"


    # CHANNEL NORMALIZATION
    def normalize_message(self, payload, channel):
        try:
            self.logger.info("Normalizing message", extra={"channel": channel})

            user_id = None
            message = None
            timestamp = None
            attachments = []

            # WhatsApp / Twilio
            if channel.lower() in ["whatsapp", "twilio"]:
                user_id = payload.get("from") or payload.get("WaId")
                message = payload.get("body") or payload.get("message")
                timestamp = payload.get("timestamp")

                if payload.get("media_url"):
                    attachments.append({
                        "type": "media",
                        "url": payload.get("media_url")
                    })

            # Instagram
            elif channel.lower() == "instagram":
                user_id = payload.get("sender", {}).get("id")

                msg = payload.get("message")

                if isinstance(msg, dict):
                    message = msg.get("text", "")
                    attachments = msg.get("attachments", [])
                else:
                    message = msg or ""

                timestamp = payload.get("timestamp")
                
            # Fallback
            else:
                user_id = payload.get("user_id") or payload.get("sender_id")
                message = payload.get("text") or payload.get("message")
                timestamp = payload.get("timestamp")

            normalized = {
                "user_id": user_id,
                "message": message,
                "channel": channel,
                "timestamp": timestamp,
                "attachments": attachments,
                "raw_payload": payload,
                "workspace_id": payload.get("workspace_id")
            }

            self.logger.info(
                "Message normalized successfully",
                extra={"user_id": user_id, "channel": channel}
            )

            return normalized

        except Exception as e:
            self.logger.error(
                "Error normalizing message",
                exc_info=True,
                extra={"channel": channel}
            )
            return {
                "user_id": None,
                "message": None,
                "channel": channel,
                "timestamp": None,
                "attachments": [],
                "raw_payload": payload,
            }



    def send_response(self, channel, user_id, response):
        try:
            text = (
                response.get("response_text")
                or response.get("text")
                or ""
            ) if isinstance(response, dict) else str(response)

            if not text:
                return

            if channel == "twilio":
                return

            elif channel == "instagram":
                if self.response_sender:
                    self.response_sender.send_message(user_id, text)

            elif channel == "whatsapp":
                if self.response_sender:
                    self.response_sender.send_text_message(user_id, text)

        except Exception as e:
            self.logger.error("Error sending response", exc_info=True)