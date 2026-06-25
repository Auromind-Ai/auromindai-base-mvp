from app.core.logger import logger
from app.services.agentic_rag.rag_service import get_rag_service
import json
import re
from pydantic import BaseModel, Field
from typing import Optional, List


#  Output schema ─
class SalesAgentOutput(BaseModel):
    stage: str = Field(default="sales", description="greeting, discovery, presentation, closing, post_sale")
    response: str = Field(..., description="Natural reply to the customer.")
    action: Optional[str] = Field(None, description="null | search_knowledge_base | send_payment_link | book_demo | escalate_human")
    search_query: Optional[str] = Field(None, description="Query for search_knowledge_base action.")
    confidence_score: float = Field(default=0.9, description="0.0–1.0")
    intent: str = Field(default="inquiry", description="inquiry | pricing_inquiry | feature_question | product_comparison | recommendation_request | objection | booking_request | payment_request | purchase_intent | support_request")
    objection_detected: bool = Field(default=False)
    objection_category: Optional[str] = Field(None, description="price | trust | timing | competitor | feature")
    payment_required: bool = Field(default=False)
    meeting_required: bool = Field(default=False)
    meeting_date: Optional[str] = Field(None)
    meeting_time: Optional[str] = Field(None)
    timezone: Optional[str] = Field(None)
    products_mentioned: List[str] = Field(default_factory=list)
    source_verified: bool = Field(default=True, description="True ONLY if every fact comes from the KB.")
    close: bool = Field(default=False)
    escalate: bool = Field(default=False)


#  Hallucination detection patterns ─
_PRICE_PATTERN = re.compile(
    r"(?:₹|rs\.?|inr|usd|\$|price[ds]?\s*(?:at|is|are|from|starts?))\s*[\d,]+",
    re.IGNORECASE,
)
_SPEC_PATTERN = re.compile(
    r"\b(?:warranty|guarantee|year[s]?\s+warranty|free\s+delivery|free\s+shipping|"
    r"in\s+stock|available\s+now|limited\s+offer|discount\s+of)\b",
    re.IGNORECASE,
)


class SalesAgent:
    def __init__(self, llm, memory):
        self.logger = logger
        self.llm = llm
        self.memory = memory
        self.rag = get_rag_service()
        self.logger.info("SalesAgent initialized successfully")

    #  Public entry point ─
    async def handle(self, message, context):
        try:
            workspace_id    = context.get("workspace_id")
            conversation_id = context.get("conversation_id")
            db              = context.get("db")
            business_type   = context.get("business_type", "general")
            payment_enabled = context.get("payment_enabled", False)
            payment_link    = context.get("payment_link", "")
            calendar_enabled = context.get("calendar_enabled", False)

            self.logger.info("SalesAgent processing request", extra={"conversation_id": conversation_id})

            #  Conversation history 
            history = (
                self.memory.get_conversation_history(
                    workspace_id=workspace_id,
                    conversation_id=conversation_id,
                )
                if self.memory
                else []
            )
            history_text = "\n".join([
                f"{getattr(m, 'sender_type', 'Unknown')}: {getattr(m, 'content', '')}"
                for m in history[-8:]
            ])

            customer_messages = [
                m for m in history
                if any(x in str(getattr(m, "sender_type", "")).lower()
                       for x in ("customer", "user", "contact"))
            ]
            is_first_message = len(customer_messages) <= 1
            self.logger.info(
                f"SalesAgent first_message_check: history={len(history)}, "
                f"customer_msgs={len(customer_messages)}, is_first={is_first_message}"
            )

            #  Sales pipeline state 
            sales_data = {}
            if self.memory and hasattr(self.memory, "get_sales_data"):
                rec = self.memory.get_sales_data(
                    workspace_id=workspace_id, conversation_id=conversation_id
                )
                if rec:
                    sales_data = {
                        "intent":            getattr(rec, "intent", ""),
                        "objection_detected": getattr(rec, "objection_detected", False),
                        "payment_required":  getattr(rec, "payment_required", False),
                        "stage":             getattr(rec, "stage", "sales"),
                    }

            #  Already closed? ─
            if sales_data.get("payment_required") or sales_data.get("stage") == "post_sale":
                self.logger.info("SalesAgent: Deal closed — escalating to human.")
                return {
                    "stage": "post_sale",
                    "response": (
                        "I see a payment link was already sent for you. "
                        "Let me connect you with our team for any further help."
                    ),
                    "action": "escalate_human",
                    "escalate": True,
                    "close": True,
                    "confidence_score": 1.0,
                }

            #  Phase 1: RAG retrieval 
            rag_answer, rag_confidence = "", 0.0
            try:
                entry_ids = context.get("entry_ids", [])
                rag_resp = await self.rag.agent_loop(
                    db=db,
                    workspace_id=workspace_id,
                    query=message,
                    source="vector_db",
                    entry_ids=entry_ids if entry_ids else None,
                    collection="sales",
                )
                if rag_resp and rag_resp.get("answer"):
                    rag_answer     = rag_resp["answer"]
                    rag_confidence = rag_resp.get("meta", {}).get("confidence_score", 0.5)
            except Exception:
                self.logger.error("SalesAgent RAG retrieval failed", exc_info=True)

            #  Phase 2: Build prompt + call LLM 
            prompt = self._build_sales_prompt(
                message=message,
                rag_answer=rag_answer,
                history_text=history_text,
                business_type=business_type,
                payment_enabled=payment_enabled,
                payment_link=payment_link,
                calendar_enabled=calendar_enabled,
                sales_data=sales_data,
                is_first_message=is_first_message,
            )
            self._log_prompt_token_breakdown(prompt, message, rag_answer, history_text)
            self.logger.info("SalesAgent sending prompt to LLM...")

            result = await self.llm.generate_json(prompt)
            if not result:
                raise ValueError("LLM returned empty JSON")
            self.logger.info(f"SalesAgent LLM Result: {result}")

            #  Phase 3: Secondary RAG search if LLM requested ─
            if result.get("action") == "search_knowledge_base" and result.get("search_query"):
                search_query = result["search_query"]
                self.logger.info(f"SalesAgent secondary RAG search: {search_query}")
                try:
                    rag_resp2 = await self.rag.agent_loop(
                        db=db,
                        workspace_id=workspace_id,
                        query=search_query,
                        source="vector_db",
                        entry_ids=entry_ids if entry_ids else None,
                        collection="sales",
                    )
                    rag_answer2     = (rag_resp2.get("answer", "") if rag_resp2 else "") or "NO_DATA_FOUND"
                    rag_confidence2 = (rag_resp2.get("meta", {}).get("confidence_score", 0.0) if rag_resp2 else 0.0)

                    if rag_answer2 != "NO_DATA_FOUND":
                        rag_answer     = rag_answer2
                        rag_confidence = rag_confidence2
                        self.logger.info(f"SalesAgent secondary RAG updated (conf={rag_confidence2})")

                    prompt2 = self._build_sales_prompt(
                        message=message,
                        rag_answer=rag_answer2,
                        history_text=history_text,
                        business_type=business_type,
                        payment_enabled=payment_enabled,
                        payment_link=payment_link,
                        calendar_enabled=calendar_enabled,
                        sales_data=sales_data,
                        is_first_message=is_first_message,
                    )
                    self._log_prompt_token_breakdown(prompt2, message, rag_answer2, history_text)
                    result = await self.llm.generate_json(prompt2)
                    if not result:
                        raise ValueError("LLM returned empty JSON on retry")
                except Exception:
                    self.logger.error("SalesAgent secondary RAG failed", exc_info=True)
                    result["response"] = (
                        "I want to give you the most accurate information. "
                        "Let me connect you with our product specialist."
                    )
                    result["escalate"] = True
                    result["action"]   = "escalate_human"

            #  Phase 4: Anti-hallucination guard ─
            result = self._anti_hallucination_guard(result, rag_answer, rag_confidence)

            #  Phase 5: Payment link injection ─
            if result.get("action") == "send_payment_link" and result.get("payment_required"):
                if payment_enabled and payment_link:
                    resp = result.get("response", "")
                    if payment_link not in resp:
                        result["response"] = f"{resp}\n\n🔗 Payment Link: {payment_link}"
                    
                    self.logger.info("SalesAgent: Payment link injected")
                else:
                    result["response"] = (
                        result.get("response", "")
                        + "\n\nI'll connect you with our team to complete the purchase."
                    )
                    result["escalate"] = True
                    result["action"]   = "escalate_human"
                    self.logger.info("SalesAgent: No payment link — escalating")

            #  Phase 6: Graceful degradation ─
            resp_lower = result.get("response", "").lower()
            cant_find  = [
                "couldn't find", "could not find", "no information",
                "don't have information", "unable to find",
            ]
            if any(p in resp_lower for p in cant_find) and not result.get("escalate"):
                result["response"] = (
                    "That's a great question! I want to be 100% sure about that. "
                    "Let me connect you with our specialist who can provide the exact details."
                )
                result["escalate"] = True
                result["action"]   = "escalate_human"

            #  Phase 7: Empty response safety 
            if not result.get("response") or not result["response"].strip():
                self.logger.warning("SalesAgent: Empty response — applying safety fallback")
                result["response"] = (
                    "Hi! I'm Veera, your sales consultant. Welcome! "
                    "How can I help you today?"
                    if is_first_message
                    else "I'd be happy to help! Could you tell me more about what you're looking for?"
                )
                result["confidence_score"] = 0.3

            #  Phase 8: First-message Veera identity guarantee ─
            if is_first_message and "veera" not in result.get("response", "").lower():
                result["response"] = f"Hi! I'm Veera, your sales consultant. Welcome! 😊\n\n{result['response']}"
                self.logger.info("SalesAgent: Prepended Veera identity to first response")

            return result

        except Exception:
            self.logger.error("SalesAgent handle failed", exc_info=True)
            return {
                "stage": "sales",
                "response": (
                    "I'm experiencing a slight technical hiccup. "
                    "Give me a moment, or I can connect you to our team."
                ),
                "action": "escalate_human",
                "escalate": True,
                "close": False,
                "confidence_score": 0.1,
            }

    #  Anti-hallucination post-processing ─
    def _anti_hallucination_guard(self, result: dict, rag_answer: str, rag_confidence: float) -> dict:
        response_text   = result.get("response", "")
        source_verified = result.get("source_verified", True)
        confidence      = result.get("confidence_score", 0.9)
        
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 0.9

        rag_is_empty = (
            not rag_answer
            or rag_answer.strip() == ""
            or rag_answer == "NO_DATA_FOUND"
            or len(rag_answer.strip()) < 20
        )

        if not source_verified:
            self.logger.warning("SalesAgent anti-hallucination: source_verified=false")
            result.update({
                "response":        "Let me check our latest catalog to get you the accurate details.",
                "action":          "search_knowledge_base",
                "search_query":    result.get("search_query", "product catalog details"),
                "confidence_score": 0.3,
            })
            return result

        if rag_is_empty:
            has_prices = bool(_PRICE_PATTERN.search(response_text))
            has_specs  = bool(_SPEC_PATTERN.search(response_text))
            if has_prices or has_specs:
                self.logger.warning(
                    f"SalesAgent anti-hallucination BLOCKED: prices={has_prices} specs={has_specs}"
                )
                result.update({
                    "response":        "Let me pull up the exact details from our catalog. One moment.",
                    "action":          "search_knowledge_base",
                    "search_query":    "complete product catalog with pricing",
                    "confidence_score": 0.2,
                    "source_verified": False,
                })
                return result

        if confidence < 0.5 and result.get("products_mentioned"):
            if bool(_PRICE_PATTERN.search(response_text)):
                self.logger.warning("SalesAgent anti-hallucination: low confidence + price mentions")
                result.update({
                    "action":          "search_knowledge_base",
                    "search_query":    f"pricing details for {', '.join(result.get('products_mentioned', []))}",
                    "confidence_score": 0.3,
                })
                return result

        return result

    #  Token breakdown logger 
    def _log_prompt_token_breakdown(
        self, prompt: str, message: str, rag_answer: str, history_text: str
    ):
        try:
            import tiktoken
            enc          = tiktoken.get_encoding("o200k_base")
            rag_tok      = len(enc.encode(rag_answer))    if rag_answer    else 0
            hist_tok     = len(enc.encode(history_text))  if history_text  else 0
            msg_tok      = len(enc.encode(message))       if message       else 0
            total_tok    = len(enc.encode(prompt))
            instr_tok    = total_tok - (rag_tok + hist_tok + msg_tok)
            self.logger.info(
                f"SalesAgent token breakdown:\n"
                f"  Message: {msg_tok} | RAG: {rag_tok} | History: {hist_tok} "
                f"| Instructions: {instr_tok} | Total: {total_tok}"
            )
        except Exception as e:
            self.logger.warning(f"SalesAgent token breakdown failed: {e}")

    #  Prompt builder — fully dynamic, ~700 token ceiling 
    def _build_sales_prompt(
        self,
        message: str,
        rag_answer: str,
        history_text: str,
        business_type: str,
        payment_enabled: bool,
        payment_link: str,
        calendar_enabled: bool,
        sales_data: dict,
        is_first_message: bool,
    ) -> str:

        #  KB section ─
        kb_empty = (
            not rag_answer
            or not rag_answer.strip()
            or rag_answer.strip() == "NO_DATA_FOUND"
            or len(rag_answer.strip()) < 20
        )
        kb_section = (
            "STATUS: EMPTY — No product data for this query. "
            "Do not state any product name, price, spec, warranty, stock, discount, or delivery detail. "
            "Set action=search_knowledge_base, source_verified=false, confidence_score=0.3."
            if kb_empty
            else (
                "STATUS: DATA AVAILABLE — Use ONLY the following. Do not supplement from memory.\n"
                f"---\n{rag_answer}\n---"
            )
        )

        #  First-message section ─
        has_catalog = not kb_empty and len(rag_answer.strip()) > 50
        if is_first_message:
            first_msg_section = (
                "FIRST MESSAGE — no catalog data yet. "
                "Introduce as Veera. "
                "Do not invent products, prices, plans, catalog items, features, or offers. "
                "If catalog data is unavailable, skip product recommendations completely. "
                "Provide only a greeting and ask how you can help. "
                "action=null."
                if has_catalog
                else
                "FIRST MESSAGE — no catalog data yet. "
                "Introduce as Veera. "
                "Generic greeting → action=search_knowledge_base, search_query=complete product catalog. "
                "Specific question answered by KB → action=null."
            )
        else:
            first_msg_section = "FOLLOW-UP — do not re-introduce. Continue naturally from history."

        #  Payment section 
        if payment_enabled and payment_link:
            payment_section = (
                "ENABLED. Purchase confirmed → action=send_payment_link, "
                "payment_required=true, lead_score=hot. "
                "System appends the link — do NOT include the URL in your response."
            )
        elif payment_enabled:
            payment_section = "ENABLED — no link configured. Purchase intent → escalate=true."
        else:
            payment_section = "DISABLED. Purchase intent → escalate=true."

        #  Meeting section 
        meeting_section = (
            "Calendar: enabled. Demo/meeting requested → collect date, time, timezone "
            "(one field at a time). All three collected → action=book_demo, meeting_required=true."
            if calendar_enabled
            else "Calendar: disabled."
        )

        #  Schema hint (field names only — keeps tokens low) 
        schema_hint = (
            "Required JSON fields: "
            "stage, response, action, search_query, lead_score, confidence_score, intent, "
            "objection_detected, objection_category, payment_required, meeting_required, "
            "meeting_date, meeting_time, timezone, products_mentioned, source_verified, close, escalate"
        )

        return (
            f"You are Veera, a professional sales consultant for {business_type}. "
            "You are a confident human expert — never identify as an AI.\n\n"

            f"## KNOWLEDGE BASE\n{kb_section}\n\n"

            f"## MESSAGE CONTEXT\n{first_msg_section}\n\n"

            "## SALES STAGES\n"
            "greeting→discovery→presentation→closing→post_sale\n"
            "- greeting: Introduce as Veera. Welcome. Present KB products if available, else search.\n"
            "- discovery: Understand need. One question at a time. KB-only answers.\n"
            "- presentation: Present KB-verified details. Ask closing question after. Populate products_mentioned.\n"
            "- closing: Purchase confirmed → action=send_payment_link, payment_required=true, lead_score=hot.\n"
            "- post_sale: Payment link sent → close=true.\n\n"

            "## ANTI-HALLUCINATION\n"
            "- Source: ONLY the KB section above. Never invent product names, prices, specs, "
            "discounts, warranties, stock, or delivery details.\n"
            "- Use KB values verbatim. Do not convert units or paraphrase numbers.\n"
            "- KB missing data → action=search_knowledge_base, precise search_query, "
            "source_verified=false, confidence_score=0.3.\n"
            "- KB has answer → action=null, source_verified=true. Never run a redundant search.\n\n"

            f"## PAYMENT\n{payment_section}\n\n"

            f"## MEETING / DEMO\n{meeting_section}\n\n"

            "## OBJECTION HANDLING\n"
            "Acknowledge concern. KB-only response. "
            "Set objection_detected=true, objection_category=price|trust|timing|competitor|feature.\n\n"

            "## ESCALATION\n"
            "escalate=true, action=escalate_human ONLY when: human explicitly requested | "
            "info unavailable post-search | business decision needed.\n\n"

            "## STYLE\n"
            "Concise, professional, human. Answer before asking follow-ups. "
            "No scripts or pressure tactics.\n\n"

            f"## CONVERSATION HISTORY\n{history_text}\n\n"

            "## PREVIOUS CONTEXT\n"
            f"Intent: {sales_data.get('intent', 'None')} | "
            f"Objection: {sales_data.get('objection_detected', False)}\n\n"

            f"## CUSTOMER MESSAGE\n{message}\n\n"

            f"## OUTPUT\nReturn ONLY valid JSON. No markdown, no extra text.\n{schema_hint}"
        )