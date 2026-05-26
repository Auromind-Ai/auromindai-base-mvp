from app.core.logger import logger
from app.services.agentic_rag.rag_service import build_rag_system
import json

class UnifiedAgent:

    def __init__(self, llm, memory):
        self.logger = logger
        self.llm = llm
        self.memory = memory
        self.rag = build_rag_system()

        self.logger.info("UnifiedAgent initialized successfully")

    async def handle(self, message, context):
        try:
            user_id = context.get("user_id")
            workspace_id = context.get("workspace_id")
            conversation_id = context.get("conversation_id")
            db = context.get("db")

            # Dynamic context from orchestration layer
            agent_type = context.get("agent_type", "greeting_agent")
            turn_count = context.get("turn_count", 0)
            repeat_count = context.get("repeat_count", 0)

            self.logger.info("UnifiedAgent processing request", extra={
                "user_id": user_id,
                "conversation_id": conversation_id,
                "agent_type": agent_type,
                "turn_count": turn_count,
                "repeat_count": repeat_count
            })

            # Fetch State
            state = (
                self.memory.get_conversation_state(
                    workspace_id=workspace_id,
                    conversation_id=conversation_id,
                )
                if self.memory and workspace_id and conversation_id
                else {}
            )
            current_stage = state.get("current_stage", "lead") if state else "lead"

            # Fetch Lead Data
            lead = (
                self.memory.get_lead_data(
                    workspace_id=workspace_id,
                    conversation_id=conversation_id,
                )
                if self.memory and workspace_id and conversation_id
                else None
            )
            lead_data = {
                "name": getattr(lead, "name", "") or "",
                "requirement": getattr(lead, "requirement", "") or "",
                "budget": getattr(lead, "budget", "") or "",
                "timeline": getattr(lead, "timeline", "") or "",
                "contact": getattr(lead, "contact", "") or ""
            } if lead else {
                "name": "",
                "requirement": "",
                "budget": "",
                "timeline": "",
                "contact": ""
            }

            # Conversation history 
            history = (
                self.memory.get_conversation_history(
                    workspace_id=workspace_id,
                    conversation_id=conversation_id,
                )
                if self.memory and workspace_id and conversation_id
                else []
            )
            history_text = "\n".join([
                f"{getattr(msg, 'sender_type', 'Unknown')}: {getattr(msg, 'content', '')}"
                for msg in history[-5:]
            ])

            # RAG Context retrieval
            rag_answer = ""
            if agent_type in ["sales_agent", "support_agent"]:
                try:
                    rag_response = await self.rag.agent_loop(
                        db=db,
                        workspace_id=workspace_id,
                        query=message
                    )
                    if rag_response and "answer" in rag_response:
                        rag_answer = rag_response.get("answer")
                except Exception as e:
                    self.logger.error("RAG retrieval failed", exc_info=True)

            # Build missing fields list for lead agent
            missing_fields = [k for k, v in lead_data.items() if not v]
            collected_fields = {k: v for k, v in lead_data.items() if v}

            
            prompt = f"""
            You are an AI-powered CRM assistant. Your behavior depends on the assigned agent_type.

            -------------------------------------
            ASSIGNED AGENT TYPE: {agent_type}
            -------------------------------------

            CONTEXT INPUT:
            agent_type: {agent_type}
            lead_data: {json.dumps(lead_data, indent=2)}
            turn_count: {turn_count}
            repeat_count: {repeat_count}
            current_stage: {current_stage}

            Conversation History:
            {history_text}

            User Message:
            "{message}"

            Knowledge Base:
            {rag_answer}

            -------------------------------------
            GLOBAL RULES (ALWAYS APPLY)
            -------------------------------------
            - Keep responses short (1-3 lines max)
            - Do not ask unnecessary questions
            - Do not repeat the same question
            - Always move towards closure
            - Be polite, professional, and clear
            - Do not hallucinate information
            - Friendly tone, short sentences
            - No long paragraphs, no emojis overload

            -------------------------------------
            AGENT LOGIC (FOLLOW STRICTLY)
            -------------------------------------

            1. GREETING AGENT (agent_type = "greeting_agent")
            - Action: Greet and ask how you can help
            - Response example: "Hi! 👋 How can I assist you today?"
            - Set action = "greet"

            2. LEAD AGENT (agent_type = "lead_agent")
            - Goal: Collect ONLY missing fields from: name, requirement, budget, timeline, contact
            - Missing fields right now: {json.dumps(missing_fields)}
            - Already collected: {json.dumps(collected_fields)}
            - Ask ONLY missing fields
            - Do NOT ask already filled fields
            - Ask one or two questions max per turn
            - When ALL fields are collected → respond: "Thanks for the details! Our team will contact you shortly." → action = "lead_complete", close = true
            - If user already gave all details and asks again → respond: "We've already captured your details. Our team will reach out soon." → close = true


            3. SALES AGENT (agent_type = "sales_agent")
            - Answer ONLY what user asked using the Knowledge Base
            - Do NOT give extra information
            - Do NOT ask multiple questions
            - After answering: "For further assistance, our team can connect with you. Please share your contact details."
            - Collect ONLY contact
            - After contact received → "Thanks! Our team will contact you soon." → action = "sales_close", close = true

            4. SUPPORT AGENT (agent_type = "support_agent")
            - Scope: Issue resolution, privacy policy, return policy
            - Keep answers short and clear
            - Stay within scope
            - If query is outside scope → escalate = true


            5. CLOSING AGENT (agent_type = "closing_agent")
            - Respond politely
            - Example:
            "You're welcome! 😊 Our team will contact you shortly."
            - Do NOT ask questions
            - Set close = true

    
            -------------------------------------
            OUTPUT FORMAT (STRICT JSON ONLY)
            -------------------------------------
            Return ONLY valid JSON, no extra text:

            {{
            "stage": "",
            "response": "",
            "action": "",
            "collect": {{
                "name": "",
                "requirement": "",
                "budget": "",
                "timeline": "",
                "contact": ""
            }},
            "escalate": false,
            "close": false,
            "confidence_score": 0.95
            }}

            ACTION TYPES:
            - greet
            - collect_lead
            - lead_complete
            - sales_answer
            - sales_close
            - support_answer
            - support_ticket
            - escalate_human
            - close_conversation

            STAGE VALUES:
            - greeting
            - lead
            - sales
            - support

            -------------------------------------
            IMPORTANT REMINDERS
            -------------------------------------
            - Extract any data the user provides in their message into the "collect" object
            - Only populate "collect" fields that the user actually provided in THIS message
            - Do NOT re-ask fields already in "Already collected"
            - Return ONLY the JSON object, nothing else
            """

            # Generate structured JSON
            self.logger.info("Sending prompt to LLM...")
            result = self.llm.generate_json(prompt)
            self.logger.info(f"LLM Result: {result}")
            if not result:
                raise ValueError("LLM returned empty JSON")

            self.logger.info("UnifiedAgent generated response successfully", extra={"stage": result.get("stage")})
            return result

        except Exception as e:
            self.logger.error("UnifiedAgent failed", exc_info=True)
            return {
                "stage": "support",
                "response": "I'm sorry, I'm having trouble processing that right now. Could you please clarify?",
                "action": "support_answer",
                "collect": {},
                "escalate": False,
                "close": False,
                "confidence_score": 0.1
            }
