from app.core.logger import logger
from app.services.agentic_rag.rag_service import get_rag_service
import json

class UnifiedAgent:

    def __init__(self, llm, memory):
        self.logger = logger
        self.llm = llm
        self.memory = memory
        self.rag = get_rag_service()

        self.logger.info("UnifiedAgent initialized successfully")

    async def handle(self, message, context):
        try:
            workspace_id = context.get("workspace_id")
            conversation_id = context.get("conversation_id")
            db = context.get("db")

            agent_type = context.get("agent_type", "greeting_agent")
            turn_count = context.get("turn_count", 0)
            repeat_count = context.get("repeat_count", 0)

            self.logger.info("UnifiedAgent processing request", extra={
                "conversation_id": conversation_id,
                "agent_type": agent_type,
                "turn_count": turn_count,
                "repeat_count": repeat_count
            })

            # ── LEAD_DEBUG: Log incoming message ──
            self.logger.warning(f"[LEAD_DEBUG][unified_agent] Incoming message: {message!r}")

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
            lead = self.memory.get_lead_data(
                workspace_id=workspace_id,
                conversation_id=conversation_id
            ) if self.memory else None
            lead_fields = context.get("lead_fields", [])
            if isinstance(lead_fields, str):
                lead_fields = [
                    field.strip()
                    for field in lead_fields.split(",")
                    if field.strip()
                ]
            self.logger.warning(
                f"lead_fields={lead_fields} "
                f"type={type(lead_fields)}"
            )
            calendar_enabled = context.get("calendar_enabled", False)
            payment_enabled = context.get("payment_enabled", False)

            # Build lead_data from persisted memory
            lead_data = {}
            for field in lead_fields:
                val = ""
                if lead:
                    if lead.custom_fields and field in lead.custom_fields:
                        val = lead.custom_fields[field]
                    elif hasattr(lead, field):
                        val = getattr(lead, field, "")
                lead_data[field] = val or ""

            # ── LEAD_DEBUG: Log lead_data loaded from DB ──
            self.logger.warning(
                f"[LEAD_DEBUG][unified_agent] lead_data BEFORE extraction: {lead_data}"
            )

            # Conversation history
            history = self.memory.get_conversation_history(
                workspace_id=workspace_id,
                conversation_id=conversation_id
            ) if self.memory else []
            history_text = "\n".join([
                f"{getattr(msg, 'sender_type', 'Unknown')}: {getattr(msg, 'content', '')}"
                for msg in history[-6:]
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
                    if (
                        rag_response and
                        rag_response.get("answer") and
                        rag_response.get("answer").strip()
                    ):
                        rag_answer = rag_response.get("answer")
                except Exception as e:
                    self.logger.error("RAG retrieval failed", exc_info=True)

            if agent_type == "support_agent" and not rag_answer:
                return {
                    "stage": "support",
                    "response": (
                        "Currently this information is not available "
                        "in our system. Our support team will "
                        "contact you shortly."
                    ),
                    "action": "escalate_human",
                    "collect": {},
                    "escalate": True,
                    "close": False,
                    "confidence_score": 0.4
                }

            # Build missing/collected for lead agent
            def get_ordered_missing(lead_fields, lead_data):
                return [f for f in lead_fields if not lead_data.get(f)]

            missing_fields = get_ordered_missing(lead_fields, lead_data)
            collected_fields = {k: v for k, v in lead_data.items() if v}
            next_field = missing_fields[0] if missing_fields else None
            all_fields_collected = len(missing_fields) == 0 and len(lead_fields) > 0

            # ── LEAD_DEBUG: Log computed missing/collected before LLM ──
            self.logger.warning(
                f"[LEAD_DEBUG][unified_agent] collected_fields: {collected_fields}"
            )
            self.logger.warning(
                f"[LEAD_DEBUG][unified_agent] missing_fields BEFORE LLM: {missing_fields}"
            )
            self.logger.warning(
                f"[LEAD_DEBUG][unified_agent] next_field={next_field}, all_collected={all_fields_collected}"
            )

            # Agent Router
            if agent_type in ["lead_agent", "greeting_agent"]:
                prompt = self._build_lead_prompt(
                    message=message,
                    lead_data=lead_data,
                    missing_fields=missing_fields,
                    collected_fields=collected_fields,
                    next_field=next_field,
                    history_text=history_text,
                    business_type=context.get("business_type", "general"),
                    lead_fields=lead_fields,
                    calendar_enabled=calendar_enabled,
                )

            elif agent_type == "sales_agent":
                prompt = self._build_sales_prompt(
                    message=message,
                    rag_answer=rag_answer,
                    history_text=history_text,
                    business_type=context.get("business_type", "general"),
                    payment_enabled=payment_enabled,
                )

            elif agent_type == "support_agent":
                prompt = self._build_support_prompt(
                    message=message,
                    rag_answer=rag_answer,
                    history_text=history_text,
                    business_type=context.get("business_type", "general"),
                )

            else:
                prompt = self._build_lead_prompt(
                    message=message,
                    lead_data=lead_data,
                    missing_fields=missing_fields,
                    collected_fields=collected_fields,
                    next_field=next_field,
                    history_text=history_text,
                    business_type=context.get("business_type", "general"),
                    lead_fields=lead_fields,
                    calendar_enabled=calendar_enabled,
                )

            self.logger.info("Sending prompt to LLM...")
            result = self.llm.generate_json(prompt)
            self.logger.info(f"LLM Result: {result}")

            # ── LEAD_DEBUG: Log raw LLM output ──
            self.logger.warning(f"[LEAD_DEBUG][unified_agent] RAW LLM RESULT: {result}")

            if not result:
                raise ValueError("LLM returned empty JSON")

            # If all lead fields are collected, check if demo booking is enabled
            newly_collected = result.get("collect") or {} if result else {}
            for field in lead_fields:
                if result and field in result and result[field] and not newly_collected.get(field):
                    newly_collected[field] = result[field]

            # ── LEAD_DEBUG: Log newly_collected from LLM ──
            self.logger.warning(
                f"[LEAD_DEBUG][unified_agent] newly_collected from LLM: {newly_collected}"
            )

            total_collected = {**collected_fields, **{k: v for k, v in newly_collected.items() if v}}
            all_fields_now_collected = len(lead_fields) > 0 and all(total_collected.get(f) for f in lead_fields)

            is_completed_now = all_fields_collected or all_fields_now_collected

            # Determine if we should send the deterministic thank you message and escalate immediately
            should_override_thankyou = False
            if is_completed_now:
                if not calendar_enabled:
                    
                    should_override_thankyou = True
                else:
                    #
                    llm_action = result.get("action") if result else None
                    if llm_action == "lead_complete":
                        should_override_thankyou = True

            if should_override_thankyou:
                result = {
                    "stage": "lead",
                    "response": "Thank you. Our team will contact you shortly.",
                    "collect": newly_collected,
                    "lead_score": "warm",
                    "confidence_score": 0.9,
                    "action": "lead_complete",
                    "meeting_date": None,
                    "meeting_time": None,
                    "timezone": None,
                    "close": True,
                    "escalate": True
                }
                self.logger.info("Deterministic completion override triggered.")

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

    def _build_lead_prompt(
    self,
    message,
    lead_data,
    missing_fields,
    collected_fields,
    next_field,
    history_text,
    business_type="general",
    lead_fields=None,
        calendar_enabled=False,
    ):
        print(f"lead_data: {lead_data}")
        lead_fields = lead_fields or []
        all_fields_collected = len(missing_fields) == 0 and len(lead_fields) > 0

        if all_fields_collected and calendar_enabled:
            return f"""
            You are a professional Demo Booking Assistant on WhatsApp.

            All qualification lead fields have already been successfully collected from the user.
            Your ONLY goal now is to handle demo/meeting scheduling.

            CONVERSATION HISTORY:
            {history_text}

            LATEST USER MESSAGE:
            {message}

            INSTRUCTIONS:
            1. If the user declines the demo (e.g., they say "no", "don't want", "not now", "decline", or express refusal):
            - You MUST set "action" to "lead_complete" and "escalate" to true.
            - Keep "close" as false or true (the system will handle it).
            - Set "response" to a friendly closing like "No problem! I will connect you with our team." (The system will override this with the deterministic thank you message).
            
            2. If the user agrees to the demo or is scheduling it:
            - Check if they provided the meeting_date, meeting_time, or timezone.
            - If any of these are missing, ask for them one at a time.
            - Once meeting_date, meeting_time, and timezone are all collected, set "action" to "book_demo", "close" to true, and "escalate" to true.

            RETURN STRICT JSON ONLY — no markdown, no explanation:

            {{
                "stage": "lead",
                "response": "your natural reply here",
                "collect": {{}},
                "lead_score": "warm",
                "confidence_score": 0.9,
                "action": null,
                "meeting_date": null,
                "meeting_time": null,
                "timezone": null,
                "close": false,
                "escalate": false
            }}

            VALID action values: null | "book_demo" | "lead_complete"
            - Use "lead_complete" when they decline the demo.
            - Use "book_demo" when date, time, and timezone are all collected.
            """

        # Build a clear summary of what is already known
        collected_summary = (
            "\n".join([f"  - {k}: {v}" for k, v in collected_fields.items()])
            if collected_fields
            else "  (none yet)"
        )

        missing_summary = (
            "\n".join([f"  - {k}" for k in missing_fields])
            if missing_fields
            else "  (all collected)"
        )

        if calendar_enabled:
            demo_instructions = """
    DEMO BOOKING (only after ALL lead fields are collected):
    - Ask the user if they would like to schedule a demo/meeting.
    - If yes, collect: meeting_date, meeting_time, timezone (one at a time).
    - Once all three are collected, set action = "book_demo" and close = true.
    - If user declines demo, set action = "lead_complete" and escalate = true.
    """
        else:
            demo_instructions = """
    COMPLETION:
    - Once ALL lead fields are collected, thank the user and set action = "lead_complete" and escalate = true.
    """

        return f"""
        You are a professional Lead Qualification Agent on WhatsApp.

        BUSINESS TYPE: {business_type}

        LEAD FIELDS TO COLLECT (in order):
        {json.dumps(lead_fields)}

        ALREADY COLLECTED (DO NOT ask for these again):
        {collected_summary}

        NEXT FIELD TO ASK:
        {next_field}

        CONVERSATION HISTORY:
        {history_text}

        LATEST USER MESSAGE:
        {message}

        STRICT RULES:
        1. NEVER ask for a field that is already in "ALREADY COLLECTED".
        2. Check if the LATEST USER MESSAGE provides the value for the "NEXT FIELD TO ASK" (or any other missing fields):
        - If YES:
            a. You MUST extract that value and include it in the "collect" dictionary in your JSON output.
            b. Warmly acknowledge the value they just provided.
            c. Find the next missing field in the "LEAD FIELDS TO COLLECT" list (one that is NOT in "ALREADY COLLECTED" and was NOT just provided now). Ask ONLY about this next missing field.
            d. DO NOT repeat the question for the field they just provided.
        - If NO:
            a. You MUST ask ONLY about the "NEXT FIELD TO ASK".
        3. Extract any values from the user's message and store them in the "collect" dictionary.
        4. Keep replies short, warm, and conversational. No markdown, no lists.
        5. Never repeat a question that was just answered or already collected.
        6. NEVER use generic or open-ended greeting/assistance phrases such as "How can I assist you today?", "How can I help you?", "What can I do for you?", or similar.
        7. Always greet the user with a simple, friendly "Hi" (or "Hi [Name]" if the user's name is known from ALREADY COLLECTED or the conversation history) and then immediately and directly ask the question to collect the "NEXT FIELD TO ASK". Keep the focus entirely on asking that specific field question.


        {demo_instructions}

        CURRENT STATE:
        - All lead fields collected: {"YES" if all_fields_collected else "NO"}
        - calendar_enabled: {calendar_enabled}

        RETURN STRICT JSON ONLY — no markdown, no explanation:

        {{
            "stage": "lead",
            "response": "your natural reply here",
            "collect": {{"field_name": "extracted_value"}},
            "lead_score": "warm",
            "confidence_score": 0.9,
            "action": null,
            "meeting_date": null,
            "meeting_time": null,
            "timezone": null,
            "close": false,
            "escalate": false
        }}

        VALID action values: null | "book_demo" | "lead_complete"
        - Use "lead_complete" + escalate=true when all fields done and no demo or demo declined.
        - Use "book_demo" + close=true when meeting_date, meeting_time, timezone are all collected.
        - Keep action null while still collecting fields or demo details.
        """

    def _build_sales_prompt(
        self,
        message,
        rag_answer,
        history_text,
        business_type="general",
        payment_enabled=False
    ):
        return f"""
        You are an elite AI Sales Executive.

        BUSINESS TYPE: {business_type}

        CONVERSATION HISTORY:
        {history_text}

        CUSTOMER MESSAGE:
        {message}

        KNOWLEDGE BASE:
        {rag_answer}

        GOALS:
        1. Convert the customer professionally
        2. Explain product/services clearly using ONLY the knowledge base
        3. Handle objections naturally
        4. Push toward booking/demo/payment
        5. Keep replies concise and persuasive

        IMPORTANT:
        - Never hallucinate features or pricing
        - Never invent offers
        - If knowledge base is empty: say "Our team will contact you shortly." and set escalate=true

        DEMO RULES:
        1. If customer asks for a demo/consultation/call/meeting, you MUST collect three details: meeting_date, meeting_time, and timezone.
        2. Check if they have provided all three. If any are missing, politely ask for the missing details one at a time and keep action = null.
        3. Once meeting_date, meeting_time, and timezone are all collected, set action = "book_demo".

        PAYMENT RULES:
        If customer shows strong buying intent AND payment_enabled={payment_enabled}:
        set action = "send_payment_link"

        RETURN STRICT JSON ONLY:
        {{
            "stage": "sales",
            "response": "your reply",
            "action": null,
            "lead_score": "hot",
            "confidence_score": 0.95,
            "intent": "pricing_inquiry",
            "objection_detected": false,
            "payment_required": false,
            "meeting_required": false,
            "meeting_date": null,
            "meeting_time": null,
            "timezone": null,
            "close": false,
            "escalate": false
        }}

        VALID ACTIONS: null | "book_demo" | "send_payment_link"
        """

    def _build_support_prompt(
        self,
        message,
        rag_answer,
        history_text,
        business_type="general"
    ):
        return f"""
        You are an elite AI Customer Support Agent.

        BUSINESS TYPE: {business_type}

        CONVERSATION HISTORY:
        {history_text}

        CUSTOMER ISSUE:
        {message}

        KNOWLEDGE BASE:
        {rag_answer}

        GOALS:
        1. Solve customer issues clearly using ONLY the knowledge base
        2. Keep responses short and human
        3. Escalate only when necessary

        ESCALATION RULES:
        Escalate if:
        - knowledge base has no answer
        - billing/legal/security issue
        - customer is angry/frustrated

        RAG FAILURE:
        If knowledge base is empty: say "Our support team will contact you shortly." and set escalate=true

        RETURN STRICT JSON ONLY:
        {{
            "stage": "support",
            "response": "your reply",
            "action": null,
            "issue_type": "technical_issue",
            "priority": "medium",
            "sentiment": "calm",
            "confidence_score": 0.95,
            "resolved": false,
            "escalate": false,
            "close": false
        }}

        VALID ACTIONS: null | "create_ticket"
        """