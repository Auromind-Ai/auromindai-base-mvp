from app.core.logger import logger
from app.services.agentic_rag.rag_service import get_rag_service
from app.models.ai_action import SupportTicket
from uuid import UUID
import json

class SupportAgent:

    def __init__(self, llm, memory):
        self.logger = logger
        self.llm = llm
        self.memory = memory
        self.rag = get_rag_service()
        self.logger.info("SupportAgent initialized successfully")

    def _get_open_ticket(self, db, workspace_id, conversation_id):
        if not db:
            return None
        try:
            ws_id = UUID(str(workspace_id)) if not isinstance(workspace_id, UUID) else workspace_id
            conv_id = UUID(str(conversation_id)) if not isinstance(conversation_id, UUID) else conversation_id
            return (
                db.query(SupportTicket)
                .filter(
                    SupportTicket.workspace_id == ws_id,
                    SupportTicket.conversation_id == conv_id,
                    SupportTicket.status == "open"
                )
                .first()
            )
        except Exception as e:
            self.logger.error(f"Error querying open ticket: {e}", exc_info=True)
            return None

    def _is_valid_rag_answer(self, answer: str) -> bool:
        """Check if RAG answer is a real solution, not a 'not available' message."""
        if not answer or not answer.strip():
            return False
        negative_phrases = [
            "not available in the current knowledge base",
            "not available in provided documents",
            "information not available",
            "no relevant information found",
            "please upload relevant documents",
            "i don't have information",
            "i couldn't find",
            "no information available",
        ]
        answer_lower = answer.lower().strip()
        return not any(phrase in answer_lower for phrase in negative_phrases)

    async def query_rag(self, db, workspace_id, query, entry_ids=None):
        try:
            rag_response = await self.rag.agent_loop(
                db=db,
                workspace_id=workspace_id,
                query=query,
                source="vector_db",
                entry_ids=entry_ids if entry_ids else None,
                # ── FIX: Only query support collections in vector_db ──
                collection=["support", "support_agent"]
            )
            if (
                rag_response and
                rag_response.get("answer") and
                rag_response.get("answer").strip()
            ):
                return rag_response.get("answer").strip()
        except Exception as e:
            self.logger.error("RAG retrieval failed in SupportAgent", exc_info=True)
        return None

    async def handle(self, message, context):
        try:
            workspace_id = context.get("workspace_id")
            conversation_id = context.get("conversation_id")
            db = context.get("db")
            entry_ids = context.get("entry_ids", [])
            business_type = context.get("business_type", "general")

            self.logger.info("SupportAgent processing request", extra={
                "conversation_id": conversation_id,
                "workspace_id": workspace_id,
            })

            # 1. Double ticket prevention check
            open_ticket = self._get_open_ticket(db, workspace_id, conversation_id)
            if open_ticket:
                ticket_num = f"TKT-{str(open_ticket.id)[:8].upper()}"
                self.logger.info(f"Open ticket {ticket_num} found for conversation {conversation_id}. Rejecting new ticket request.")
                return {
                    "stage": "support",
                    "response": f"Your ticket ({ticket_num}) is already being processed. Once this problem is solved, you can raise another ticket if needed.",
                    "action": None,
                    "collect": {},
                    "escalate": True,
                    "close": True,
                    "confidence_score": 1.0
                }

            # Fetch Lead Data to read/store support variables
            lead = self.memory.get_lead_data(
                workspace_id=workspace_id,
                conversation_id=conversation_id
            ) if self.memory else None

            # Initialize custom fields if they don't exist
            custom_fields = lead.custom_fields if (lead and lead.custom_fields) else {}

            # Load support state from custom fields
            support_stage = custom_fields.get("support_stage", "new")
            support_name = custom_fields.get("support_name", "")
            support_contact = custom_fields.get("support_contact", "")
            support_problem = custom_fields.get("support_problem", "")
            support_rag_solution = custom_fields.get("support_rag_solution", "")

            self.logger.info(
                f"[SUPPORT] Loaded state: stage={support_stage} name={support_name!r} "
                f"contact={support_contact!r} problem={support_problem!r}"
            )

            # If user has already escalated or resolved in this turn sequence, reset/initialize
            if support_stage in ["escalated", "resolved"]:
                support_stage = "new"
                support_name = ""
                support_contact = ""
                support_problem = ""
                support_rag_solution = ""

            # Fetch Conversation History
            history = self.memory.get_conversation_history(
                workspace_id=workspace_id,
                conversation_id=conversation_id
            ) if self.memory else []
            history_text = "\n".join([
                f"{getattr(msg, 'sender_type', 'Unknown')}: {getattr(msg, 'content', '')}"
                for msg in history[-8:]
            ])

            # Build LLM prompt
            prompt = f"""
You are a highly professional Customer Support Agent.
Your goal is to collect the user's name, contact details (email or phone), and problem description to create a support ticket.

BUSINESS TYPE: {business_type}

CURRENT STATE:
- support_stage: {support_stage}
- support_name: {support_name!r}
- support_contact: {support_contact!r}
- support_problem: {support_problem!r}
- support_rag_solution: {support_rag_solution!r}

CONVERSATION HISTORY:
{history_text}

LATEST USER MESSAGE:
{message}

STAGE TRANSITION RULES (follow strictly):
- "new" → ask for name → move to "collecting_name"
- "collecting_name" → if name extracted → move to "collecting_contact"
- "collecting_contact" → if contact extracted → move to "collecting_problem"
- "collecting_problem" → if problem extracted → keep "collecting_problem" (Python will handle RAG)
- "verifying_solution" → check if user confirms fix worked

EXTRACTION RULES:
1. Extract support_name if the user provides their name in the LATEST USER MESSAGE.
2. Extract support_contact if the user provides a phone number (≥10 digits) or email in the LATEST USER MESSAGE.
3. Extract support_problem if the user describes an issue/problem in the LATEST USER MESSAGE.
4. If already collected (shown in CURRENT STATE), do NOT clear it — carry it forward in collect.

RESPONSE RULES:
- "new" or "collecting_name": ask for name politely.
- "collecting_contact": ask for contact (email or phone). If contact was JUST provided in LATEST USER MESSAGE, say "Thank you! Could you describe the issue you're facing?"
- "collecting_problem": if problem was JUST provided, respond ONLY with: "Thank you for describing the issue. Let me look up a solution for you." — DO NOT ask "Did this resolve your issue?"
- "verifying_solution": ask if the provided solution resolved the issue.
- NEVER reveal internal stage names or JSON keys.

RETURN STRICT JSON ONLY (no extra text, no markdown):
{{
    "support_stage": "<next stage string>",
    "collect": {{
        "support_name": "<extracted name or null>",
        "support_contact": "<extracted contact or null>",
        "support_problem": "<extracted problem or null>"
    }},
    "feedback": "yes" | "no" | null,
    "response": "<your natural response text>"
}}
"""

            self.logger.info("Sending support agent prompt to LLM...")
            result = await self.llm.generate_json(prompt)
            self.logger.info(f"[SUPPORT] LLM raw result: {result}")

            if not result:
                raise ValueError("LLM returned empty JSON for SupportAgent")

            # Extract LLM values
            new_stage = result.get("support_stage", support_stage)
            collect_raw = result.get("collect") or {}
            feedback = result.get("feedback")
            response_text = result.get("response", "")

            # ── Merge: prefer LLM-extracted over existing, skip nulls ──
            merged_name    = collect_raw.get("support_name")    or support_name    or ""
            merged_contact = collect_raw.get("support_contact") or support_contact or ""
            merged_problem = collect_raw.get("support_problem") or support_problem or ""

            self.logger.info(
                f"[SUPPORT] After merge: name={merged_name!r} contact={merged_contact!r} "
                f"problem={merged_problem!r} new_stage={new_stage}"
            )

            # ── Build updated_data for DB persistence ──
            updated_data = {
                "support_stage":        new_stage,
                "support_name":         merged_name,
                "support_contact":      merged_contact,
                "support_problem":      merged_problem,
                "support_rag_solution": support_rag_solution,
            }

            self.memory.update_lead_data(
                workspace_id=workspace_id,
                conversation_id=conversation_id,
                data=updated_data,
            )
            self.logger.info(f"[SUPPORT] Persisted updated_data: {updated_data}")

            # ── Build collect dict to return to Orchestration ──
            # Orchestration will also persist these via its own update_lead_data path.
            # We return all non-empty support fields so they are not lost.
            collect_for_orchestration = {
                k: v for k, v in {
                    "support_stage":        new_stage,
                    "support_name":         merged_name,
                    "support_contact":      merged_contact,
                    "support_problem":      merged_problem,
                    "support_rag_solution": support_rag_solution,
                }.items() if v
            }

            # --- POST-PROCESSING FLOWS ---

            # A. Problem just collected → query RAG
            is_problem_just_collected = (
                merged_problem and
                not support_rag_solution and
                support_stage not in ["verifying_solution", "escalated", "resolved"]
            )

            if is_problem_just_collected:
                self.logger.info("[SUPPORT] Problem collected. Querying RAG (vector_db / support collections only)...")
                rag_answer = await self.query_rag(db, workspace_id, merged_problem, entry_ids)

                # Check if RAG returned a VALID solution (not a "not available" message)
                if rag_answer and self._is_valid_rag_answer(rag_answer):
                    # ── Solution found in vector_db → show solution + ask "Did this resolve?" ──
                    self.logger.info("[SUPPORT] Valid RAG solution found. Showing to user for verification.")
                    updated_data["support_stage"] = "verifying_solution"
                    updated_data["support_rag_solution"] = rag_answer
                    collect_for_orchestration["support_stage"] = "verifying_solution"
                    collect_for_orchestration["support_rag_solution"] = rag_answer

                    self.memory.update_lead_data(
                        workspace_id=workspace_id,
                        conversation_id=conversation_id,
                        data=updated_data,
                    )

                    response_text = f"{rag_answer}\n\nDid this resolve your issue? Please let me know."
                    return {
                        "stage": "support",
                        "response": response_text,
                        "action": None,
                        "collect": collect_for_orchestration,
                        "escalate": False,
                        "close": False,
                        "confidence_score": 0.95,
                    }
                else:
                    # ── No valid solution in vector_db → directly create ticket (skip "Did this resolve?") ──
                    self.logger.info("[SUPPORT] No valid RAG solution found. Directly creating support ticket.")
                    ticket = self.memory.create_support_ticket(
                        workspace_id=workspace_id,
                        conversation_id=conversation_id,
                        data={
                            "issue_type": "technical_issue",
                            "description": merged_problem,
                            "customer_name": merged_name,
                            "customer_contact": merged_contact,
                        }
                    )
                    ticket_num = f"TKT-{str(ticket.id)[:8].upper()}" if ticket else "UNKNOWN"

                    updated_data["support_stage"] = "escalated"
                    collect_for_orchestration["support_stage"] = "escalated"
                    self.memory.update_lead_data(
                        workspace_id=workspace_id,
                        conversation_id=conversation_id,
                        data=updated_data,
                    )

                    response_text = (
                        f"I understand. Since I couldn't find a direct solution in our system, "
                        f"I have created a support ticket for you.\n\n"
                        f"🎫 Ticket Number: *{ticket_num}*\n\n"
                        f"Our support team will contact you shortly."
                    )
                    return {
                        "stage": "support",
                        "response": response_text,
                        "action": "create_ticket",
                        "collect": collect_for_orchestration,
                        "escalate": True,
                        "close": True,
                        "confidence_score": 0.95,
                    }

            # B. Verifying solution stage — handle feedback
            if support_stage == "verifying_solution":
                if feedback == "yes":
                    self.logger.info("[SUPPORT] User confirmed issue resolved.")
                    updated_data["support_stage"] = "resolved"
                    collect_for_orchestration["support_stage"] = "resolved"
                    self.memory.update_lead_data(
                        workspace_id=workspace_id,
                        conversation_id=conversation_id,
                        data=updated_data,
                    )
                    return {
                        "stage": "support",
                        "response": "Excellent! I'm glad we could resolve your issue. Please reach out if you need anything else. 😊",
                        "action": None,
                        "collect": collect_for_orchestration,
                        "escalate": False,
                        "close": True,
                        "confidence_score": 0.95,
                    }
                elif feedback == "no":
                    self.logger.info("[SUPPORT] User says solution didn't work. Creating ticket.")
                    ticket = self.memory.create_support_ticket(
                        workspace_id=workspace_id,
                        conversation_id=conversation_id,
                        data={
                            "issue_type": "technical_issue",
                            "description": f"RAG Solution failed. Customer issue: {merged_problem}",
                            "customer_name": merged_name,
                            "customer_contact": merged_contact,
                        }
                    )
                    ticket_num = f"TKT-{str(ticket.id)[:8].upper()}" if ticket else "UNKNOWN"

                    updated_data["support_stage"] = "escalated"
                    collect_for_orchestration["support_stage"] = "escalated"
                    self.memory.update_lead_data(
                        workspace_id=workspace_id,
                        conversation_id=conversation_id,
                        data=updated_data,
                    )

                    response_text = (
                        f"I'm sorry that didn't resolve the issue. I've created a support ticket for you.\n\n"
                        f"🎫 Ticket Number: *{ticket_num}*\n\n"
                        f"Our support team will contact you shortly."
                    )
                    return {
                        "stage": "support",
                        "response": response_text,
                        "action": "create_ticket",
                        "collect": collect_for_orchestration,
                        "escalate": True,
                        "close": True,
                        "confidence_score": 0.95,
                    }

            # C. Default: still collecting info
            return {
                "stage": "support",
                "response": response_text,
                "action": None,
                "collect": collect_for_orchestration,
                "escalate": False,
                "close": False,
                "confidence_score": 0.9,
            }

        except Exception as e:
            self.logger.error("SupportAgent handle failed", exc_info=True)
            return {
                "stage": "support",
                "response": "I apologize, but I encountered an error. Our support team will contact you shortly.",
                "action": "escalate_human",
                "collect": {},
                "escalate": True,
                "close": True,
                "confidence_score": 0.1,
            }