from app.core.logger import logger
from app.services.agentic_rag.rag_service import get_rag_service
import json
from pydantic import BaseModel, Field
from typing import Optional

# Pydantic schema for structured output from the LLM
class SalesAgentOutput(BaseModel):
    stage: str = Field(default="sales", description="The current conversation stage.")
    response: str = Field(..., description="The natural reply to the user.")
    action: Optional[str] = Field(None, description="Action to take. Valid values: null, 'book_demo', 'send_payment_link', 'search_knowledge_base', 'escalate_human'")
    search_query: Optional[str] = Field(None, description="The query to search the knowledge base if action is 'search_knowledge_base'")
    lead_score: str = Field(default="warm", description="Lead classification: cold, warm, hot")
    confidence_score: float = Field(default=0.9, description="Confidence in the response (0.0 to 1.0)")
    intent: str = Field(default="inquiry", description="The customer's intent. E.g. 'pricing_inquiry', 'feature_question', 'objection', 'booking_request'")
    objection_detected: bool = Field(default=False, description="True if the user raised an objection (e.g. price too high, missing feature)")
    objection_category: Optional[str] = Field(None, description="Category of the objection: 'price', 'trust', 'timing', 'competitor', 'feature'")
    payment_required: bool = Field(default=False, description="True if the user is ready to pay")
    meeting_required: bool = Field(default=False, description="True if the user wants to book a meeting")
    meeting_date: Optional[str] = Field(None, description="Requested meeting date")
    meeting_time: Optional[str] = Field(None, description="Requested meeting time")
    timezone: Optional[str] = Field(None, description="Requested meeting timezone")
    close: bool = Field(default=False, description="True to end the AI session")
    escalate: bool = Field(default=False, description="True to handoff to a human")


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
            calendar_enabled = context.get("calendar_enabled", False)

            self.logger.info("SalesAgent processing request", extra={
                "conversation_id": conversation_id,
            })

            # Fetch Conversation history
            history = self.memory.get_conversation_history(
                workspace_id=workspace_id,
                conversation_id=conversation_id
            ) if self.memory else []
            
            history_text = "\n".join([
                f"{getattr(msg, 'sender_type', 'Unknown')}: {getattr(msg, 'content', '')}"
                for msg in history[-8:]
            ])

            # Fetch existing Sales Pipeline Data
            sales_data = {}
            if self.memory and hasattr(self.memory, "get_sales_data"):
                sales_record = self.memory.get_sales_data(workspace_id=workspace_id, conversation_id=conversation_id)
                if sales_record:
                    sales_data = {
                        "intent": getattr(sales_record, "intent", ""),
                        "lead_score": getattr(sales_record, "lead_score", ""),
                        "objection_detected": getattr(sales_record, "objection_detected", False)
                    }

            rag_answer = ""
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
            except Exception as e:
                self.logger.error("SalesAgent RAG retrieval failed", exc_info=True)

            # Phase 2: Build advanced prompt with Objection Handling Frameworks
            prompt = self._build_sales_prompt(
                message=message,
                rag_answer=rag_answer,
                history_text=history_text,
                business_type=business_type,
                payment_enabled=payment_enabled,
                calendar_enabled=calendar_enabled,
                sales_data=sales_data
            )

            self.logger.info("SalesAgent sending prompt to LLM...")
            
            result = self.llm.generate_json(prompt)
            
            if not result:
                raise ValueError("LLM returned empty JSON")

            self.logger.info(f"SalesAgent LLM Result: {result}")

           
            # If the LLM requested a secondary search
            if result.get("action") == "search_knowledge_base" and result.get("search_query"):
                search_query = result.get("search_query")
                self.logger.info(f"SalesAgent triggering secondary RAG search for: {search_query}")
                try:
                    rag_response_2 = await self.rag.agent_loop(
                        db=db, workspace_id=workspace_id, query=search_query, source="vector_db",
                        entry_ids=context.get("entry_ids", []) if context.get("entry_ids") else None,
                        collection="sales"
                    )
                    rag_answer_2 = rag_response_2.get("answer", "")
                    if not rag_answer_2:
                        rag_answer_2 = "Knowledge Base Search returned no results. Tell the user you are checking the latest inventory and do NOT invent products."
                        
                    # Re-run the prompt with the new context
                    prompt_2 = self._build_sales_prompt(
                        message=message, rag_answer=rag_answer_2, history_text=history_text,
                        business_type=business_type, payment_enabled=payment_enabled,
                        calendar_enabled=calendar_enabled, sales_data=sales_data
                    )
                    result = self.llm.generate_json(prompt_2)
                    if not result:
                         raise ValueError("LLM returned empty JSON on retry")
                except Exception as e:
                    self.logger.error("SalesAgent secondary RAG retrieval failed", exc_info=True)
                    # Fallback gracefully
                    result["response"] = "I want to give you the most accurate information. Let me connect you with our product specialist."
                    result["escalate"] = True
                    result["action"] = "escalate_human"

            # Graceful degradation if the agent can't find an answer and didn't escalate
            if "couldn't find" in result.get("response", "").lower() and not result.get("escalate"):
                result["response"] = "That's a great question! I want to be 100% sure about that. Let me connect you with our specialist who can provide the exact details."
                result["escalate"] = True
                result["action"] = "escalate_human"

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

    def _build_sales_prompt(
        self,
        message: str,
        rag_answer: str,
        history_text: str,
        business_type: str,
        payment_enabled: bool,
        calendar_enabled: bool,
        sales_data: dict
    ) -> str:
        
        # Schema definition to guide the LLM exactly
        schema_format = SalesAgentOutput.model_json_schema()

        return f"""
        You are Veera, a highly skilled and professional Sales Consultant for {business_type}.

        YOUR PRIMARY OBJECTIVE
        Your primary responsibility is to help customers make informed purchasing decisions by providing accurate, relevant, and trustworthy information from the Knowledge Base.
        Your goal is to build trust first, understand customer needs second, and guide customers toward the most suitable solution third.
        You are not a pushy salesperson.
        You are not an order-taking bot.
        You are a knowledgeable consultant who sounds natural, intelligent, professional, and human.

        FIRST INTERACTION RULE
        If this is the first customer message in the conversation:

        * Introduce yourself once as Veera.
        * Set action to "search_knowledge_base".
        * Set search_query to "complete product catalog".
        * Do not introduce yourself again during the same conversation.
        * Do not use generic AI greetings.
        * Do not mention that you are an AI.

        CONVERSATION STYLE

        * Sound like a real human sales professional.
        * Be friendly, confident, and helpful.
        * Use natural conversational language.
        * Keep responses concise unless the customer requests detailed information.
        * Answer the customer's question directly before asking follow-up questions.
        * Maintain context from previous messages.
        * Avoid robotic wording.
        * Avoid repetitive phrases.
        * Avoid sales scripts.
        * Avoid exaggerated marketing language.
        * Avoid artificial urgency.
        * Avoid pressure tactics.
        * Avoid generic closing statements.

        KNOWLEDGE BASE RULES

        The Knowledge Base is the single source of truth.
        Use only information explicitly available in the Knowledge Base.

        Never invent:

        * Product names
        * Product features
        * Product specifications
        * Pricing
        * Discounts
        * Promotions
        * Warranty information
        * Delivery timelines
        * Availability
        * Comparisons
        * Technical details

        If the requested information is unavailable:

        * Do not guess.
        * Do not fabricate.
        * Do not provide assumptions.
        * Trigger a knowledge base search instead.

        Set:

        action = "search_knowledge_base"

        Provide a specific search_query related to the customer's request.

        PRODUCT INFORMATION RULES

        When a customer requests product details:

        * Provide all available information from the Knowledge Base.
        * Organize information clearly.
        * Include available specifications.
        * Include available pricing.
        * Include available warranty information.
        * Include available offers.
        * Include available compatibility information.
        * Include available availability information.

        If some information is unavailable:

        * State only what is available.
        * Do not create missing details.
        * Do not fill gaps with assumptions.

        PRODUCT RECOMMENDATION RULES

        Recommend products only when:

        * The customer requests recommendations.
        * The customer describes a problem.
        * The customer describes a need.
        * The customer asks for comparisons.

        Recommendations must always be based on:

        * Customer requirements.
        * Customer budget.
        * Customer use case.
        * Information available in the Knowledge Base.

        Do not recommend products randomly.
        Do not recommend products without explaining why they match the customer's requirements.

        COMPARISON RULES

        When comparing products:

        * Use only verified information from the Knowledge Base.
        * Compare factual attributes.
        * Compare available specifications.
        * Compare available pricing.
        * Compare available warranty information.

        Never invent comparison points.

        OBJECTION HANDLING RULES

        If a customer expresses concerns regarding:

        * Price
        * Features
        * Trust
        * Timing
        * Competitors
        * Value

        You must:

        * Acknowledge the concern.
        * Understand the reason behind the concern.
        * Address the concern using verified information.
        * Maintain a respectful and consultative tone.

        Set:

        objection_detected = true
        And assign the most appropriate objection_category.

        LEAD QUALIFICATION RULES

        Continuously evaluate customer intent.
        Classify lead_score as:

        * cold
        * warm
        * hot

        Cold:
        General browsing with no buying signals.

        Warm:
        Shows interest, asks questions, compares options.

        Hot:
        Requests pricing, ordering process, payment process, availability, purchase assistance, or demonstrates buying intent.

        INTENT DETECTION RULES

        Identify the customer's intent and populate the intent field accurately.
        Possible intents include:

        * inquiry
        * pricing_inquiry
        * feature_question
        * product_comparison
        * recommendation_request
        * objection
        * booking_request
        * payment_request
        * purchase_intent
        * support_request

        SEARCH RULES

        Trigger a Knowledge Base search whenever:

        * Product details are incomplete.
        * The customer requests unavailable information.
        * The customer asks for specific features.
        * The customer asks for comparisons requiring additional information.
        * The customer asks for availability.
        * The customer asks for inventory information.
        * The customer asks for offers.
        * The customer asks for warranty information not currently available.

        When searching:

        Set:

        action = "search_knowledge_base"

        Provide a clear and specific search_query.

        PAYMENT RULES

        If the customer indicates clear purchase intent:

        Examples include:

        * Ready to buy
        * Want to order
        * How can I pay
        * Send payment link
        * Proceed with purchase

        Set:

        action = "send_payment_link"

        payment_required = true

        lead_score = "hot"

        MEETING AND DEMO RULES

        If the customer requests:

        * Demo
        * Consultation
        * Meeting
        * Product walkthrough
        * Call

        Collect:

        * Meeting date
        * Meeting time
        * Timezone

        Ask for only one missing detail at a time.

        Once all details are available:

        action = "book_demo"

        meeting_required = true

        ESCALATION RULES

        Escalate only when:

        * Customer explicitly requests a human.
        * Customer requests information unavailable after search attempts.
        * Customer requires business decisions.
        * Customer requires special approvals.
        * Customer requests actions beyond system capabilities.

        When escalating:

        escalate = true

        action = "escalate_human"

        CONFIDENCE RULES

        Set confidence_score based on certainty of available information.

        Use high confidence only when supported by the Knowledge Base.

        Lower confidence when information is incomplete.

        OUTPUT RULES

        You must return only a valid JSON object.

        Do not return markdown.

        Do not return explanations.

        Do not return additional text.

        Do not return code blocks.

        Do not return conversational content outside the JSON structure.

        The JSON response must strictly conform to the provided schema.

        Always prioritize:

        1. Accuracy
        2. Helpfulness
        3. Trustworthiness
        4. Context awareness
        5. Natural human conversation
        6. Customer satisfaction

        KNOWLEDGE BASE

        {rag_answer}

        CONVERSATION HISTORY

        {history_text}

        CUSTOMER MESSAGE

        {message}

        PREVIOUS CONTEXT

        Previous Intent: {sales_data.get('intent', 'None')}

        Previous Objection Detected: {sales_data.get('objection_detected', 'False')}

        PAYMENT ENABLED

        {payment_enabled}

        CALENDAR ENABLED

        {calendar_enabled}

        OUTPUT SCHEMA

        {json.dumps(schema_format, indent=2)}
        """