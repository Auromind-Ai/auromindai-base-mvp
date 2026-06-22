from app.core.logger import logger
from app.services.agentic_rag.rag_service import get_rag_service
import json
import re
from pydantic import BaseModel, Field
from typing import Optional, List

# Pydantic schema for structured output from the LLM
class SalesAgentOutput(BaseModel):
    stage: str = Field(default="sales", description="The current conversation stage: greeting, discovery, presentation, closing, post_sale")
    response: str = Field(..., description="The natural reply to the user.")
    action: Optional[str] = Field(None, description="Action to take. Valid values: null, 'search_knowledge_base', 'send_payment_link', 'book_demo', 'escalate_human'")
    search_query: Optional[str] = Field(None, description="The query to search the knowledge base if action is 'search_knowledge_base'")
    lead_score: str = Field(default="warm", description="Lead classification: cold, warm, hot")
    confidence_score: float = Field(default=0.9, description="Confidence in the response (0.0 to 1.0)")
    intent: str = Field(default="inquiry", description="The customer's intent. E.g. 'pricing_inquiry', 'feature_question', 'objection', 'booking_request', 'purchase_intent'")
    objection_detected: bool = Field(default=False, description="True if the user raised an objection (e.g. price too high, missing feature)")
    objection_category: Optional[str] = Field(None, description="Category of the objection: 'price', 'trust', 'timing', 'competitor', 'feature'")
    payment_required: bool = Field(default=False, description="True if the user is ready to pay and wants the payment link")
    meeting_required: bool = Field(default=False, description="True if the user wants to book a meeting")
    meeting_date: Optional[str] = Field(None, description="Requested meeting date")
    meeting_time: Optional[str] = Field(None, description="Requested meeting time")
    timezone: Optional[str] = Field(None, description="Requested meeting timezone")
    products_mentioned: List[str] = Field(default_factory=list, description="List of product names from the Knowledge Base that were mentioned in this response")
    source_verified: bool = Field(default=True, description="True ONLY if every product detail in the response comes directly from the Knowledge Base. False if any information was assumed or unavailable.")
    close: bool = Field(default=False, description="True to end the AI session")
    escalate: bool = Field(default=False, description="True to handoff to a human")


# ─── Hallucination detection patterns ───
_PRICE_PATTERN = re.compile(
    r"(?:₹|rs\.?|inr|usd|\$|price[ds]?\s*(?:at|is|are|from|starts?))\s*[\d,]+",
    re.IGNORECASE,
)
_SPEC_PATTERN = re.compile(
    r"\b(?:warranty|guarantee|year[s]?\s+warranty|free\s+delivery|free\s+shipping|in\s+stock|available\s+now|limited\s+offer|discount\s+of)\b",
    re.IGNORECASE,
)


class SalesAgent:
    def __init__(self, llm, memory):
        self.logger = logger
        self.llm = llm
        self.memory = memory
        self.rag = get_rag_service()
        self.logger.info("SalesAgent initialized successfully")

    async def handle(self, message, context):
        try:
            workspace_id = context.get("workspace_id")
            conversation_id = context.get("conversation_id")
            db = context.get("db")
            business_type = context.get("business_type", "general")
            payment_enabled = context.get("payment_enabled", False)
            payment_link = context.get("payment_link", "")
            calendar_enabled = context.get("calendar_enabled", False)

            self.logger.info("SalesAgent processing request", extra={
                "conversation_id": conversation_id,
            })

            # ── Fetch conversation history ──
            history = self.memory.get_conversation_history(
                workspace_id=workspace_id,
                conversation_id=conversation_id
            ) if self.memory else []

            history_text = "\n".join([
                f"{getattr(msg, 'sender_type', 'Unknown')}: {getattr(msg, 'content', '')}"
                for msg in history[-8:]
            ])

            # ── CODE-LEVEL first message detection ──
            # Count only customer messages (not AI responses)
            customer_messages = [
                msg for msg in history
                if any(x in str(getattr(msg, 'sender_type', '')).lower() for x in ('customer', 'user', 'contact'))
            ]
            is_first_message = len(customer_messages) <= 1

            self.logger.info(f"SalesAgent first_message_check: history_len={len(history)}, customer_msgs={len(customer_messages)}, is_first={is_first_message}")

            # ── Fetch existing sales pipeline data ──
            sales_data = {}
            if self.memory and hasattr(self.memory, "get_sales_data"):
                sales_record = self.memory.get_sales_data(workspace_id=workspace_id, conversation_id=conversation_id)
                if sales_record:
                    sales_data = {
                        "intent": getattr(sales_record, "intent", ""),
                        "lead_score": getattr(sales_record, "lead_score", ""),
                        "objection_detected": getattr(sales_record, "objection_detected", False),
                        "payment_required": getattr(sales_record, "payment_required", False),
                        "stage": getattr(sales_record, "stage", "sales")
                    }

            # ── Check if deal is already closed / payment link sent ──
            if sales_data.get("payment_required") or sales_data.get("stage") == "post_sale":
                self.logger.info("SalesAgent: Deal already closed/payment link sent. Escalating to human.")
                return {
                    "stage": "post_sale",
                    "response": "I see we've already generated a payment link for you. I'm connecting you with a human representative to assist with any further questions or to confirm your order.",
                    "action": "escalate_human",
                    "escalate": True,
                    "close": True,
                    "confidence_score": 1.0
                }

            # ── Phase 1: RAG retrieval ──
            rag_answer = ""
            rag_confidence = 0.0
            try:
                entry_ids = context.get("entry_ids", [])
                rag_response = await self.rag.agent_loop(
                    db=db,
                    workspace_id=workspace_id,
                    query=message,
                    source="vector_db",
                    entry_ids=entry_ids if entry_ids else None,
                    collection="sales"
                )
                if rag_response and rag_response.get("answer"):
                    rag_answer = rag_response.get("answer")
                    rag_confidence = rag_response.get("meta", {}).get("confidence_score", 0.5)
            except Exception as e:
                self.logger.error("SalesAgent RAG retrieval failed", exc_info=True)

            # ── Phase 2: Build the prompt ──
            prompt = self._build_sales_prompt(
                message=message,
                rag_answer=rag_answer,
                history_text=history_text,
                business_type=business_type,
                payment_enabled=payment_enabled,
                payment_link=payment_link,
                calendar_enabled=calendar_enabled,
                sales_data=sales_data,
                is_first_message=is_first_message
            )

            # Log prompt token breakdown before sending to LLM
            self._log_prompt_token_breakdown(prompt, message, rag_answer, history_text)

            self.logger.info("SalesAgent sending prompt to LLM...")

            result = self.llm.generate_json(prompt)

            if not result:
                raise ValueError("LLM returned empty JSON")

            self.logger.info(f"SalesAgent LLM Result: {result}")

            # ── Phase 3: Secondary RAG search if needed ──
            if result.get("action") == "search_knowledge_base" and result.get("search_query"):
                search_query = result.get("search_query")
                self.logger.info(f"SalesAgent triggering secondary RAG search for: {search_query}")
                try:
                    rag_response_2 = await self.rag.agent_loop(
                        db=db, workspace_id=workspace_id, query=search_query, source="vector_db",
                        entry_ids=context.get("entry_ids", []) if context.get("entry_ids") else None,
                        collection="sales"
                    )
                    rag_answer_2 = rag_response_2.get("answer", "") if rag_response_2 else ""
                    rag_confidence_2 = rag_response_2.get("meta", {}).get("confidence_score", 0.0) if rag_response_2 else 0.0

                    if not rag_answer_2:
                        rag_answer_2 = "NO_DATA_FOUND"
                    else:
                        # CRITICAL: Update rag_answer to the latest data so the
                        # anti-hallucination guard validates against the CORRECT source
                        rag_answer = rag_answer_2
                        rag_confidence = rag_confidence_2
                        self.logger.info(f"SalesAgent: RAG answer updated from secondary search (confidence={rag_confidence_2})")

                    # Re-run the prompt with the new context
                    prompt_2 = self._build_sales_prompt(
                        message=message, rag_answer=rag_answer_2, history_text=history_text,
                        business_type=business_type, payment_enabled=payment_enabled,
                        payment_link=payment_link, calendar_enabled=calendar_enabled,
                        sales_data=sales_data, is_first_message=is_first_message
                    )

                    # Log retry prompt token breakdown
                    self._log_prompt_token_breakdown(prompt_2, message, rag_answer_2, history_text)

                    result = self.llm.generate_json(prompt_2)
                    if not result:
                        raise ValueError("LLM returned empty JSON on retry")
                except Exception as e:
                    self.logger.error("SalesAgent secondary RAG retrieval failed", exc_info=True)
                    # Fallback gracefully
                    result["response"] = "I want to give you the most accurate information. Let me connect you with our product specialist."
                    result["escalate"] = True
                    result["action"] = "escalate_human"

            # ── Phase 4: Anti-Hallucination Post-Processing Guard ──
            result = self._anti_hallucination_guard(result, rag_answer, rag_confidence)

            # ── Phase 5: Payment link injection ──
            if result.get("action") == "send_payment_link" and result.get("payment_required"):
                if payment_enabled and payment_link:
                    # Append the actual payment link to the response
                    response_text = result.get("response", "")
                    if payment_link not in response_text:
                        result["response"] = f"{response_text}\n\n🔗 Payment Link: {payment_link}"
                    result["lead_score"] = "hot"
                    self.logger.info("SalesAgent: Payment link injected into response")
                elif not payment_link:
                    # No payment link configured — escalate to human
                    result["response"] = result.get("response", "") + "\n\nI'll connect you with our team to complete the purchase process."
                    result["escalate"] = True
                    result["action"] = "escalate_human"
                    self.logger.info("SalesAgent: No payment link configured, escalating to human")

            # ── Phase 6: Graceful degradation ──
            response_lower = result.get("response", "").lower()
            cant_find_phrases = ["couldn't find", "could not find", "no information", "don't have information", "unable to find"]
            if any(phrase in response_lower for phrase in cant_find_phrases) and not result.get("escalate"):
                result["response"] = "That's a great question! I want to be 100% sure about that. Let me connect you with our specialist who can provide the exact details."
                result["escalate"] = True
                result["action"] = "escalate_human"

            # ── Phase 7: Response safety check — NEVER return empty response ──
            if not result.get("response") or not result["response"].strip():
                self.logger.warning("SalesAgent: Empty response detected, applying safety fallback")
                if is_first_message:
                    result["response"] = "Hi! I'm Veera, your sales consultant. Welcome! How can I help you today? I'd be happy to share details about our products or answer any questions you may have."
                else:
                    result["response"] = "I'd be happy to help you with that! Could you share a bit more about what you're looking for?"
                result["confidence_score"] = 0.3

            # ── Phase 8: First message greeting guarantee ──
            if is_first_message:
                resp = result.get("response", "")
                if "veera" not in resp.lower():
                    result["response"] = f"Hi! I'm Veera, your sales consultant. Welcome! 😊\n\n{resp}"
                    self.logger.info("SalesAgent: Prepend Veera identity introduction to first response")

            return result

        except Exception as e:
            self.logger.error("SalesAgent handle failed", exc_info=True)
            return {
                "stage": "sales",
                "response": "I'm experiencing a slight technical hiccup. Give me one moment, or I can connect you to our team.",
                "action": "escalate_human",
                "escalate": True,
                "close": False,
                "confidence_score": 0.1
            }

    def _anti_hallucination_guard(self, result: dict, rag_answer: str, rag_confidence: float) -> dict:
        """
        Post-processing guard that catches hallucinated product info.
        If RAG returned no data but the LLM response contains prices/specs,
        it's hallucinating — override with a safe response.
        """
        response_text = result.get("response", "")
        source_verified = result.get("source_verified", True)
        confidence = result.get("confidence_score", 0.9)

        rag_is_empty = (
            not rag_answer
            or rag_answer.strip() == ""
            or rag_answer == "NO_DATA_FOUND"
            or len(rag_answer.strip()) < 20
        )

        # Case 1: LLM explicitly says source is NOT verified
        if not source_verified:
            self.logger.warning("SalesAgent anti-hallucination: LLM flagged source_verified=false")
            result["response"] = "Let me check our latest catalog to get you the accurate details on that."
            result["action"] = "search_knowledge_base"
            result["search_query"] = result.get("search_query", "product catalog details")
            result["confidence_score"] = 0.3
            return result

        # Case 2: RAG returned nothing but response has specific prices/specs
        if rag_is_empty:
            has_prices = bool(_PRICE_PATTERN.search(response_text))
            has_specs = bool(_SPEC_PATTERN.search(response_text))

            if has_prices or has_specs:
                self.logger.warning(
                    f"SalesAgent anti-hallucination BLOCKED: RAG empty but response has "
                    f"prices={has_prices} specs={has_specs}. Overriding response."
                )
                result["response"] = "Let me pull up the exact details from our catalog for you. One moment please."
                result["action"] = "search_knowledge_base"
                result["search_query"] = "complete product catalog with pricing"
                result["confidence_score"] = 0.2
                result["source_verified"] = False
                return result

        # Case 3: Low confidence with product mentions
        if confidence < 0.5 and result.get("products_mentioned"):
            has_prices = bool(_PRICE_PATTERN.search(response_text))
            if has_prices:
                self.logger.warning(
                    "SalesAgent anti-hallucination: Low confidence with price mentions. Triggering search."
                )
                result["action"] = "search_knowledge_base"
                result["search_query"] = f"pricing details for {', '.join(result.get('products_mentioned', []))}"
                result["confidence_score"] = 0.3
                return result

        return result

    def _log_prompt_token_breakdown(self, prompt: str, message: str, rag_answer: str, history_text: str):
        try:
            import tiktoken
            encoder = tiktoken.get_encoding("o200k_base")
            rag_tokens = len(encoder.encode(rag_answer)) if rag_answer else 0
            history_tokens = len(encoder.encode(history_text)) if history_text else 0
            message_tokens = len(encoder.encode(message)) if message else 0
            total_prompt_tokens = len(encoder.encode(prompt))
            system_instr_tokens = total_prompt_tokens - (rag_tokens + history_tokens + message_tokens)

            self.logger.info(
                f"SalesAgent prompt token breakdown:\n"
                f"  - Customer Message: {message_tokens} tokens\n"
                f"  - RAG / Knowledge Base: {rag_tokens} tokens\n"
                f"  - Conversation History: {history_tokens} tokens\n"
                f"  - System Instructions / Schema / Template: {system_instr_tokens} tokens\n"
                f"  - Total Prompt: {total_prompt_tokens} tokens"
            )
        except Exception as e:
            self.logger.warning(f"SalesAgent token breakdown failed: {e}")

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
        is_first_message: bool
    ) -> str:

        # Schema definition to guide the LLM exactly
        schema_format = SalesAgentOutput.model_json_schema()

        # Build the knowledge base status section
        if not rag_answer or rag_answer.strip() == "" or rag_answer == "NO_DATA_FOUND":
            kb_section = """KNOWLEDGE BASE STATUS: EMPTY
No product information is currently available from the Knowledge Base for this query.

CRITICAL INSTRUCTION WHEN KNOWLEDGE BASE IS EMPTY:
You MUST NOT provide any product names, prices, specifications, features, delivery info, warranty info, or availability.
You MUST respond with a general acknowledgment and trigger a knowledge base search.
Set action = "search_knowledge_base" with an appropriate search_query.
Set source_verified = false
Set confidence_score = 0.3"""
        else:
            kb_section = f"""KNOWLEDGE BASE STATUS: DATA AVAILABLE
The following information was retrieved from the Knowledge Base. Use ONLY this information to answer.

--- START OF KNOWLEDGE BASE DATA ---
Query: {message}
Answer: {rag_answer}
--- END OF KNOWLEDGE BASE DATA ---

CRITICAL: Your response must be based EXCLUSIVELY on the data between the START and END markers above.
If a customer asks about something NOT covered in the data above, do NOT guess. Trigger a search instead."""

        # Payment section
        if payment_enabled and payment_link:
            payment_section = f"""PAYMENT CONFIGURATION: ENABLED
Payment Link: {payment_link}

When the customer confirms they want to buy/purchase/order:
1. Confirm the product and quantity
2. Set action = "send_payment_link"
3. Set payment_required = true
4. Set lead_score = "hot"
5. Include a friendly message about the payment link being sent
6. The system will automatically append the payment link — do NOT include the URL in your response"""
        elif payment_enabled:
            payment_section = """PAYMENT CONFIGURATION: ENABLED BUT NO LINK CONFIGURED
If the customer wants to buy, acknowledge their interest and let them know you will connect them with the team to complete the purchase.
Set escalate = true"""
        else:
            payment_section = """PAYMENT CONFIGURATION: DISABLED
If the customer wants to buy, acknowledge their interest and let them know you will connect them with someone who can help complete the purchase.
Set escalate = true"""

        # First message section
        if is_first_message:
            # Check if the knowledge base already has product catalog data
            has_catalog_data = (
                rag_answer
                and rag_answer.strip() != ""
                and rag_answer != "NO_DATA_FOUND"
                and len(rag_answer.strip()) > 50
            )

            if has_catalog_data:
                first_msg_section = """THIS IS THE CUSTOMER'S FIRST MESSAGE AND PRODUCT CATALOG DATA IS AVAILABLE.
You MUST:
1. Introduce yourself as Veera, a sales consultant for this business.
2. Welcome the customer warmly and professionally.
3. Acknowledge their message/question.
4. Pick 3-4 top/popular products from the Knowledge Base data and briefly suggest them.
   - Show product name and price for each.
   - Keep it concise — one line per product.
5. Ask which product they are interested in or if they want to see more options.
6. Do NOT set action = "search_knowledge_base" since you already have the data.

Example first response:
"Hi! I'm Veera, your sales consultant. Welcome! 😊

Here are some of our popular products:

🔹 AeroPulse Smartwatch — $129
🔹 NimbusSound Earbuds — $79
🔹 CrystalView Monitor — $249
🔹 VoltEdge Power Bank — $49

Would you like to know more about any of these, or are you looking for something specific?"

IMPORTANT: Use ONLY product names and prices from the Knowledge Base data. NEVER invent products.
DO NOT introduce yourself again in subsequent messages."""
            else:
                first_msg_section = """THIS IS THE CUSTOMER'S FIRST MESSAGE.
You MUST:
1. Introduce yourself as Veera, a sales consultant for this business.
2. Welcome the customer warmly and professionally.
3. Acknowledge their message/question.
4. If they asked a specific question, answer it from the Knowledge Base (if available).
5. If they sent a generic greeting (hi/hello), ask how you can help them today.
6. ONLY if they sent a generic greeting (hi/hello) and you did NOT answer any specific product question, set action = "search_knowledge_base" and search_query = "complete product catalog". If they asked a specific product question and you answered it from the Knowledge Base, do NOT set action = "search_knowledge_base" (set action = null).

Example first response for a greeting:
"Hi! I'm Veera, your sales consultant. Welcome! How can I help you today? I'd be happy to share details about our products or answer any questions you may have."

Example first response for a product question:
"Hi! I'm Veera, your sales consultant. Great question! [Answer from Knowledge Base]. Would you like to know more about any specific product?"

DO NOT introduce yourself again in subsequent messages."""
        else:
            first_msg_section = """THIS IS A FOLLOW-UP MESSAGE (not the first message).
DO NOT introduce yourself. Continue the conversation naturally.
Maintain context from the conversation history."""

        return f"""You are Veera, a highly skilled and professional Sales Consultant for {business_type}.

YOUR IDENTITY
You are Veera — a knowledgeable, trustworthy sales consultant.
You are NOT an AI chatbot.
You are NOT a generic assistant.
You sound like a real, experienced human sales professional.

─────────────────────────────────────────
FIRST MESSAGE STATUS
─────────────────────────────────────────
{first_msg_section}

─────────────────────────────────────────
PROFESSIONAL SALES FLOW
─────────────────────────────────────────
Follow this natural sales progression:

STAGE 1 — GREETING (first message only)
→ Self-introduce as Veera
→ Welcome the customer
→ Auto-search product catalog

STAGE 2 — DISCOVERY
→ Understand what the customer needs
→ Ask clarifying questions (one at a time)
→ Answer questions ONLY from Knowledge Base data
→ Never guess or assume

STAGE 3 — PRESENTATION
→ Present relevant products/services from Knowledge Base
→ Highlight features, specifications, pricing (ONLY from Knowledge Base)
→ After presenting product details, ask: "Would you like to go ahead with this?" or "Shall I help you place the order?"
→ This is where you proactively nudge toward purchase

STAGE 4 — CLOSING
→ When customer confirms purchase intent (yes, I want to buy, proceed, order it, etc.)
→ Confirm the product and details
→ Set action = "send_payment_link", payment_required = true
→ The system handles payment link delivery

STAGE 5 — POST SALE
→ After payment link is sent, confirm and offer further help
→ Set close = true to end the session

─────────────────────────────────────────
ANTI-HALLUCINATION RULES (ABSOLUTE)
─────────────────────────────────────────
These rules are NON-NEGOTIABLE. Violating them is a critical failure.

RULE 1: The Knowledge Base is your ONLY source of product information.
RULE 2: If the Knowledge Base has NO data, you have NO product information to share.
RULE 3: NEVER invent, guess, assume, or fabricate:
  - Product names
  - Product features or specifications
  - Pricing (prices, discounts, offers)
  - Availability or stock status
  - Delivery timelines
  - Warranty or guarantee details
  - Compatibility information
  - Comparisons with other products

RULE 4: When information is unavailable:
  - Say: "Let me check that for you" or "Let me pull up the details"
  - Set action = "search_knowledge_base"
  - Set search_query = specific query related to the customer's question
  - Set source_verified = false
  - Set confidence_score = 0.3
  - NEVER say "I think..." or "Usually..." or "Most products..."

RULE 5: Set source_verified = true ONLY when EVERY fact in your response exists in the Knowledge Base data above.
RULE 6: Set source_verified = false if you are unsure about ANY detail.
RULE 7: You MUST use the exact numbers, specs, and details provided in the KNOWLEDGE BASE DATA. Do NOT convert, modify, or assume any values. For example, if RAG says "18 Months", do NOT change it to "1 year" or "12 months". Use the exact phrase "18 Months".

EXAMPLE OF CORRECT BEHAVIOR:
Customer: "What's the price of Model X?"
Knowledge Base: (empty or no data about Model X)
CORRECT: "Let me check the pricing details for Model X. One moment."
WRONG: "Model X is priced at ₹15,000 with free delivery." ← THIS IS HALLUCINATION. NEVER DO THIS.

EXAMPLE OF CORRECT BEHAVIOR:
Customer: "Do you have any offers?"
Knowledge Base: "10% off on Product A until June 30"
CORRECT: "Yes! We currently have 10% off on Product A, valid until June 30. Would you like to know more about it?"
WRONG: "We have 20% off on all products this month!" ← THIS IS HALLUCINATION. NEVER DO THIS.

─────────────────────────────────────────
{kb_section}
─────────────────────────────────────────

─────────────────────────────────────────
PRODUCT PRESENTATION RULES
─────────────────────────────────────────
When Knowledge Base data IS available:
1. Present information clearly and organized
2. Include: name, key features, specifications, pricing, availability — ONLY what exists in KB
3. After presenting, ALWAYS ask a buying question:
   - "Would you like to go ahead with [product]?"
   - "Shall I help you place the order?"
   - "Would you like to proceed with the purchase?"
4. Track products mentioned in the products_mentioned field
5. If customer shows interest but hasn't committed, provide more details or address concerns

─────────────────────────────────────────
{payment_section}
─────────────────────────────────────────

─────────────────────────────────────────
CONVERSATION STYLE
─────────────────────────────────────────
- Sound like a real human sales professional
- Be friendly, confident, and helpful
- Keep responses concise unless the customer requests details
- Answer the customer's question directly before asking follow-ups
- Maintain context from previous messages
- Avoid robotic wording, repetitive phrases, scripts
- Avoid exaggerated marketing language, artificial urgency, pressure tactics

─────────────────────────────────────────
OBJECTION HANDLING
─────────────────────────────────────────
If the customer raises concerns about price, features, trust, timing, or competitors:
1. Acknowledge the concern genuinely
2. Address it using ONLY verified Knowledge Base information
3. Set objection_detected = true
4. Set the appropriate objection_category
5. Never dismiss or argue with the customer

─────────────────────────────────────────
LEAD SCORING
─────────────────────────────────────────
cold = General browsing, no buying signals
warm = Shows interest, asks questions, compares options
hot = Requests pricing, ordering, payment, or shows clear purchase intent

─────────────────────────────────────────
INTENT DETECTION
─────────────────────────────────────────
Classify the customer's intent accurately:
inquiry, pricing_inquiry, feature_question, product_comparison,
recommendation_request, objection, booking_request, payment_request,
purchase_intent, support_request

─────────────────────────────────────────
SEARCH RULES
─────────────────────────────────────────
Trigger a Knowledge Base search ONLY when:
- Product details are incomplete or missing.
- Customer asks about specific features/specs/prices not in the current KB data.
- Customer asks for comparisons needing additional data.

CRITICAL: If the current KNOWLEDGE BASE DATA already contains the complete information to answer the customer's question, you MUST NOT trigger a search. Set action = null and answer directly. Never run redundant searches for information you already have.

Set action = "search_knowledge_base" with a clear, specific search_query.

─────────────────────────────────────────
MEETING AND DEMO RULES
─────────────────────────────────────────
If the customer requests a demo, consultation, or meeting:
1. Collect: meeting date, meeting time, timezone (ask one at a time)
2. Once all details are available: action = "book_demo", meeting_required = true

Calendar Enabled: {calendar_enabled}

─────────────────────────────────────────
ESCALATION RULES
─────────────────────────────────────────
Escalate ONLY when:
- Customer explicitly asks for a human
- Information is unavailable after search attempts
- Customer requires business decisions or special approvals
- Request is beyond system capabilities

Set escalate = true and action = "escalate_human"

─────────────────────────────────────────
CONFIDENCE RULES
─────────────────────────────────────────
- High confidence (0.8-1.0): Answer fully supported by Knowledge Base
- Medium confidence (0.5-0.7): Partially supported, some gaps
- Low confidence (0.1-0.4): Minimal or no KB support — trigger search

─────────────────────────────────────────
CONVERSATION HISTORY
─────────────────────────────────────────
{history_text}

─────────────────────────────────────────
CUSTOMER MESSAGE
─────────────────────────────────────────
{message}

─────────────────────────────────────────
PREVIOUS CONTEXT
─────────────────────────────────────────
Previous Intent: {sales_data.get('intent', 'None')}
Previous Lead Score: {sales_data.get('lead_score', 'None')}
Previous Objection Detected: {sales_data.get('objection_detected', 'False')}

─────────────────────────────────────────
OUTPUT FORMAT
─────────────────────────────────────────
Return ONLY a valid JSON object. No markdown, no explanations, no extra text.
The JSON must conform to this schema:

{json.dumps(schema_format, indent=2)}
"""