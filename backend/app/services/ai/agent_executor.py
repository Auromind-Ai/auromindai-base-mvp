import asyncio
import logging
import time
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.services.config_service import config_service
from app.models.brain import BrainEntry
from app.core.security import to_uuid

logger = logging.getLogger(__name__)

# AI Tone presets with exact behavioral instructions for the LLM
TONE_PRESETS: Dict[str, str] = {
    "Friendly & Professional": (
        "Tone Directive: Friendly & Professional. Maintain a warm, polite, and approachable demeanor "
        "while providing competent, accurate, and business-focused responses. Balance empathy with clarity."
    ),
    "Casual & Conversational": (
        "Tone Directive: Casual & Conversational. Speak naturally and warmly like a knowledgeable friend. "
        "Use conversational phrasing, contractions, and appropriate emojis to feel relatable and human."
    ),
    "Sales & Persuasive": (
        "Tone Directive: Sales & Persuasive. Be proactive, enthusiastic, and value-oriented. "
        "Focus on customer benefits, highlight special offers or standout product features, guide the user "
        "towards making a purchase or booking a demo, and end with an engaging call-to-action question."
    ),
    "Empathetic & Supportive": (
        "Tone Directive: Empathetic & Supportive. Show deep patience, understanding, and active listening. "
        "Validate customer concerns, apologize sincerely for difficulties, and guide them step-by-step to solutions."
    ),
    "Concise & Direct": (
        "Tone Directive: Concise & Direct. Keep responses short, precise, and immediately actionable. "
        "Avoid fluff, unnecessary pleasantries, and lengthy paragraphs. Answer directly in 1-3 crisp sentences."
    ),
    "Formal & Authoritative": (
        "Tone Directive: Formal & Authoritative. Use dignified, precise, and sophisticated enterprise language. "
        "Maintain professional distance, flawless grammar, and authoritative business phrasing."
    ),
}

# Channel specific communication guidelines
CHANNEL_GUIDELINES: Dict[str, str] = {
    "whatsapp": (
        "Channel: WhatsApp. Keep paragraphs short (1-3 sentences). Use WhatsApp formatting (e.g. *bold* for emphasis). "
        "Do not use markdown links; write URLs in plain text. Keep replies mobile-friendly and fast to read."
    ),
    "instagram": (
        "Channel: Instagram Direct Message. Keep responses energetic, friendly, and visually engaging. "
        "Use relevant emojis naturally. Avoid long walls of text; break info into short messages."
    ),
    "messenger": (
        "Channel: Facebook Messenger. Conversational and prompt. Provide clear direct answers with clear next steps."
    ),
    "website": (
        "Channel: Website Live Chat. Rich Markdown formatting is supported (bold, bullet points, headers, links). "
        "Offer helpful product links and structured overviews."
    ),
    "gmail": (
        "Channel: Email (Gmail). Structure the reply like a professional email with a polite salutation, "
        "organized body paragraphs or bullet points, and a professional sign-off."
    ),
    "calendar": (
        "Channel: Calendar Assistant. Focus on scheduling, time slots, confirmation, and meeting details."
    )
}

# Timeout mappings from Max Response Time setting
TIMEOUT_MAP: Dict[str, float] = {
    "fast": 8.0,      # < 5-8 seconds target
    "normal": 18.0,   # 5-10 seconds target with buffer
    "relaxed": 35.0,  # 10-30 seconds target
}


def build_system_prompt(
    agent_config: Dict[str, Any],
    channel: str = "whatsapp",
    knowledge_context: str = ""
) -> str:
    """
    Assembles the complete system prompt from:
    1. Agent identity & business details
    2. User's Custom System Prompt (primary behavioral directives)
    3. AI Tone instructions
    4. Channel specific guidelines
    5. Response format constraints
    6. Knowledge base context
    """
    ai_conf = agent_config.get("ai_config", {})
    name = agent_config.get("name") or "AI Assistant"
    agent_type = (agent_config.get("agent_type") or "sales_assistant").replace("_", " ")
    business_name = agent_config.get("business_name") or "our company"
    website_url = agent_config.get("website_url") or ""
    language = agent_config.get("language") or "English (India)"

    # Tone preference: check ai_config.tone or agent level tone_of_voice
    tone = ai_conf.get("tone") or agent_config.get("tone_of_voice") or "Friendly & Professional"
    tone_directive = TONE_PRESETS.get(tone, f"Tone Directive: {tone}.")

    # Channel guideline
    channel_norm = channel.lower() if channel else "whatsapp"
    channel_directive = CHANNEL_GUIDELINES.get(channel_norm, f"Channel: {channel_norm.capitalize()}.")

    # Response format constraint
    resp_format = ai_conf.get("response_format", "markdown")
    if resp_format == "plain_text":
        format_rule = "Format Constraint: Output PLAIN TEXT ONLY. Never use asterisks (*), markdown headers (#), bullet points (- or *), or code fences."
    elif resp_format == "json":
        format_rule = "Format Constraint: Output valid JSON ONLY. Do not include markdown fences, preamble, or commentary."
    else:
        format_rule = "Format Constraint: Use clean Markdown formatting with clear bullet points, bold text for key terms, and readable paragraphs."

    # Penalty guidance for models that don't take frequency/presence penalty natively (like Gemini & Claude)
    penalty_guidelines = []
    freq_penalty = float(ai_conf.get("frequency_penalty", 0.0))
    pres_penalty = float(ai_conf.get("presence_penalty", 0.0))
    if freq_penalty > 0.3:
        penalty_guidelines.append("Do not repeat phrases or patterns already mentioned in the conversation.")
    if pres_penalty > 0.3:
        penalty_guidelines.append("Bring up fresh relevant details and perspectives rather than dwelling on the same point.")

    # Core user custom system prompt
    custom_sys_prompt = (ai_conf.get("system_prompt") or "").strip()
    if not custom_sys_prompt:
        custom_sys_prompt = (
            f"You are {name}, an AI {agent_type} representing '{business_name}'. "
            f"Assist users accurately, answer their queries, and guide them with high quality information."
        )

    sections = [
        f"=== IDENTITY & ROLE ===",
        f"You are: {name}",
        f"Role: {agent_type}",
        f"Representing Business: {business_name}" + (f" ({website_url})" if website_url else ""),
        f"Primary Operating Language: {language}",
        "",
        f"=== CORE BEHAVIORAL DIRECTIVES (CUSTOM SYSTEM PROMPT) ===",
        custom_sys_prompt,
        "",
        f"=== TONE OF VOICE & PERSONALITY ===",
        tone_directive,
        "",
        f"=== CHANNEL COMMUNICATION RULES ===",
        channel_directive,
        "",
        f"=== RESPONSE FORMAT RULES ===",
        format_rule,
    ]

    if penalty_guidelines:
        sections.append("")
        sections.append("=== DIVERSITY & PENALTY CONSTRAINTS ===")
        sections.extend(penalty_guidelines)

    if knowledge_context:
        sections.append("")
        sections.append("=== VERIFIED BUSINESS KNOWLEDGE BASE ===")
        sections.append(
            "Use the knowledge below as your primary source of truth. If the answer is directly contained below, "
            "provide it accurately. If not present, politely state what you know or offer to connect with a team member."
        )
        sections.append(knowledge_context)

    return "\n".join(sections)


def resolve_provider_credentials(ai_conf: Dict[str, Any]) -> tuple[str, Optional[str], Optional[str]]:
    """
    Returns (provider, api_key, base_url).
    Supports both BYOK (custom_api_key) and Platform Key (config_service).
    """
    provider = (ai_conf.get("provider") or "google").lower()
    access_mode = ai_conf.get("access_mode", "platform")
    custom_key = (ai_conf.get("custom_api_key") or "").strip()
    custom_base_url = (ai_conf.get("custom_base_url") or "").strip() or None

    if access_mode == "byok" and custom_key:
        return provider, custom_key, custom_base_url

    # Platform key lookup
    import os
    api_key = None
    if provider in ["google", "gemini"]:
        api_key = config_service.get("google_api_key") or config_service.get("gemini_api_key") or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    elif provider == "openai":
        api_key = config_service.get("openai_api_key") or os.getenv("OPENAI_API_KEY")
    elif provider in ["anthropic", "claude"]:
        api_key = config_service.get("anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY")
    elif provider == "groq":
        api_key = config_service.get("groq_api_key") or os.getenv("GROQ_API_KEY")
    elif provider == "meta":
        api_key = config_service.get("groq_api_key") or os.getenv("GROQ_API_KEY") or config_service.get("openai_api_key") or os.getenv("OPENAI_API_KEY")
    elif provider == "custom":
        api_key = custom_key

    return provider, api_key, custom_base_url


async def execute_agent_conversation(
    agent_config: Dict[str, Any],
    message: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    channel: str = "whatsapp",
    db: Optional[Session] = None,
    workspace_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fully executes an AI agent conversation turn using configured model parameters:
    temperature, max_tokens, top_p, frequency_penalty, presence_penalty,
    response_format, max_response_time, system_prompt, and tone.
    """
    start_time = time.time()
    ai_conf = agent_config.get("ai_config", {})
    knowledge_conf = agent_config.get("knowledge_config", {})
    sources_used: List[str] = []

    # 1. Collect Knowledge Base Context using the Agent's specific Collection Tag
    knowledge_context_parts: List[str] = []
    agent_collection = knowledge_conf.get("collection")
    if not agent_collection and agent_config.get("id"):
        agent_collection = f"agent_{agent_config['id']}"

    # Semantic Vector Search filtered strictly by this agent's collection tag
    if db and workspace_id and agent_collection:
        try:
            from app.services.agentic_rag.rag_service import get_rag_service
            rag = get_rag_service()
            # Perform targeted vector retrieval ONLY on this agent's collection
            retrieved_chunks = await rag.retrieval.retrieve_context_async(
                db=db,
                workspace_id=str(workspace_id),
                query=message,
                collection=agent_collection
            )
            if retrieved_chunks:
                for chunk in retrieved_chunks[:5]:
                    title = chunk.get("title") or "Knowledge Document"
                    text = chunk.get("text") or ""
                    if text:
                        sources_used.append(f"Doc: {title}")
                        knowledge_context_parts.append(f"[{title}]:\n{text[:450]}")
        except Exception as rag_err:
            logger.warning(f"Targeted vector search error for collection '{agent_collection}': {rag_err}")

    # Direct FAQs from knowledge_config if vector chunks not yet populated
    if not knowledge_context_parts:
        faqs = knowledge_conf.get("faqs", [])
        if isinstance(faqs, list):
            for faq in faqs:
                q = faq.get("question", "").strip()
                a = faq.get("answer", "").strip()
                if q and a:
                    knowledge_context_parts.append(f"Q: {q}\nA: {a}")
                    sources_used.append(f"FAQ: {q[:30]}...")

        files = knowledge_conf.get("files", [])
        if isinstance(files, list):
            for f in files:
                fname = f.get("name") or "Document"
                sources_used.append(f"File: {fname}")
                if f.get("content"):
                    knowledge_context_parts.append(f"Document [{fname}]:\n{f.get('content')[:400]}")

    knowledge_context = "\n\n".join(knowledge_context_parts)

    # 2. Build Full System Instruction
    system_instruction = build_system_prompt(agent_config, channel=channel, knowledge_context=knowledge_context)

    # 3. Model Hyperparameters
    model_name = ai_conf.get("model") or "gemini-1.5-flash"
    temperature = float(ai_conf.get("temperature", 0.7))
    # Clamp temperature between 0.0 and 1.5
    temperature = max(0.0, min(1.5, temperature))

    max_tokens = int(ai_conf.get("max_tokens", 1024))
    top_p = float(ai_conf.get("top_p", 1.0))
    top_p = max(0.05, min(1.0, top_p))

    frequency_penalty = float(ai_conf.get("frequency_penalty", 0.0))
    frequency_penalty = max(-2.0, min(2.0, frequency_penalty))

    presence_penalty = float(ai_conf.get("presence_penalty", 0.0))
    presence_penalty = max(-2.0, min(2.0, presence_penalty))

    response_format = ai_conf.get("response_format", "markdown")
    response_time_setting = ai_conf.get("max_response_time", "normal")
    timeout_seconds = TIMEOUT_MAP.get(response_time_setting, 18.0)

    # 4. Resolve Provider Credentials
    provider, api_key, custom_base_url = resolve_provider_credentials(ai_conf)

    reply_text = ""
    error_note = None

    # 5. Execute Provider API Call
    if api_key:
        try:
            # ----------------- GOOGLE GEMINI -----------------
            if provider in ["google", "gemini"]:
                from google import genai
                from google.genai import types as genai_types

                client = genai.Client(api_key=api_key)

                # Prepare contents with history
                contents = []
                if conversation_history:
                    for item in conversation_history[-6:]:
                        role = "user" if item.get("sender") in ["user", "customer"] else "model"
                        text = item.get("text") or item.get("content") or ""
                        if text:
                            contents.append(genai_types.Content(role=role, parts=[genai_types.Part.from_text(text=text)]))
                contents.append(genai_types.Content(role="user", parts=[genai_types.Part.from_text(text=message)]))

                config_kwargs = dict(
                    system_instruction=system_instruction,
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                    top_p=top_p,
                )
                if response_format == "json":
                    config_kwargs["response_mime_type"] = "application/json"

                gen_config = genai_types.GenerateContentConfig(**config_kwargs)

                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.models.generate_content,
                        model=model_name,
                        contents=contents,
                        config=gen_config
                    ),
                    timeout=timeout_seconds
                )
                reply_text = getattr(response, "text", "") or ""

            # ----------------- OPENAI / META / CUSTOM -----------------
            elif provider in ["openai", "meta", "custom"]:
                from openai import AsyncOpenAI

                client = AsyncOpenAI(
                    api_key=api_key,
                    base_url=custom_base_url if custom_base_url else None,
                    timeout=timeout_seconds
                )

                messages = [{"role": "system", "content": system_instruction}]
                if conversation_history:
                    for item in conversation_history[-6:]:
                        role = "user" if item.get("sender") in ["user", "customer"] else "assistant"
                        text = item.get("text") or item.get("content") or ""
                        if text:
                            messages.append({"role": role, "content": text})
                messages.append({"role": "user", "content": message})

                call_kwargs = dict(
                    model=model_name,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=top_p,
                    frequency_penalty=frequency_penalty,
                    presence_penalty=presence_penalty,
                )

                # Newer reasoning models (o1, o3-mini) use max_completion_tokens and do not support temperature
                if "o1" in model_name or "o3" in model_name:
                    call_kwargs.pop("temperature", None)
                    call_kwargs.pop("frequency_penalty", None)
                    call_kwargs.pop("presence_penalty", None)
                    call_kwargs["max_completion_tokens"] = max_tokens
                    call_kwargs.pop("max_tokens", None)

                if response_format == "json":
                    call_kwargs["response_format"] = {"type": "json_object"}

                res = await client.chat.completions.create(**call_kwargs)
                if res.choices and len(res.choices) > 0:
                    reply_text = res.choices[0].message.content or ""

            # ----------------- ANTHROPIC (CLAUDE) -----------------
            elif provider in ["anthropic", "claude"]:
                from anthropic import AsyncAnthropic

                client = AsyncAnthropic(api_key=api_key, timeout=timeout_seconds)

                claude_messages = []
                if conversation_history:
                    for item in conversation_history[-6:]:
                        role = "user" if item.get("sender") in ["user", "customer"] else "assistant"
                        text = item.get("text") or item.get("content") or ""
                        if text:
                            claude_messages.append({"role": role, "content": text})
                claude_messages.append({"role": "user", "content": message})

                res = await client.messages.create(
                    model=model_name,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    system=system_instruction,
                    messages=claude_messages,
                )
                if res.content and len(res.content) > 0:
                    reply_text = res.content[0].text or ""

            # ----------------- GROQ -----------------
            elif provider == "groq":
                from groq import AsyncGroq

                client = AsyncGroq(api_key=api_key, timeout=timeout_seconds)

                groq_messages = [{"role": "system", "content": system_instruction}]
                if conversation_history:
                    for item in conversation_history[-6:]:
                        role = "user" if item.get("sender") in ["user", "customer"] else "assistant"
                        text = item.get("text") or item.get("content") or ""
                        if text:
                            groq_messages.append({"role": role, "content": text})
                groq_messages.append({"role": "user", "content": message})

                res = await client.chat.completions.create(
                    model=model_name,
                    messages=groq_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=top_p,
                    frequency_penalty=frequency_penalty,
                    presence_penalty=presence_penalty,
                )
                if res.choices and len(res.choices) > 0:
                    reply_text = res.choices[0].message.content or ""

        except asyncio.TimeoutError:
            logger.warning(f"Agent execution timed out after {timeout_seconds}s for {provider}/{model_name}")
            error_note = f"Response timeout after {int(timeout_seconds)} seconds."
        except Exception as prov_err:
            logger.error(f"Agent execution error with {provider}/{model_name}: {prov_err}")
            error_note = str(prov_err)

    # 6. Fallback if no API key or provider error
    if not reply_text:
        business_name = agent_config.get("business_name") or "Orbion Store"
        agent_name = agent_config.get("name") or "AI Assistant"
        msg_lower = message.lower()

        if "stock" in msg_lower or "product" in msg_lower or "available" in msg_lower:
            reply_text = f"Hi! 👋 Yes, this item is available at {business_name}. Would you like pricing details or product specifications?"
        elif "price" in msg_lower or "cost" in msg_lower or "rate" in msg_lower:
            reply_text = f"Our standard plans start from $49 at {business_name}, with customized tiers for enterprise volume. Shall I send our complete catalog?"
        elif "order" in msg_lower or "status" in msg_lower or "tracking" in msg_lower:
            reply_text = "I'd be glad to track your order! Please share your Order ID or registered mobile number to proceed."
        elif "return" in msg_lower or "refund" in msg_lower:
            reply_text = f"At {business_name}, we offer a 7-day hassle-free return policy for unopened items. Would you like assistance initiating a return?"
        elif "meeting" in msg_lower or "book" in msg_lower or "schedule" in msg_lower:
            reply_text = "I can book a meeting with our product specialist. We have slots available tomorrow morning at 10:00 AM or 3:00 PM. Which works best?"
        else:
            reply_text = f"Hello! I am {agent_name} from {business_name}. How can I assist you today?"

        if error_note and "quota" in error_note.lower():
            sources_used.append("Note: Provider quota exceeded; using simulated reply")
        elif not api_key:
            sources_used.append(f"Note: Connect {provider.capitalize()} API key for real-time model output")

    execution_time_ms = int((time.time() - start_time) * 1000)

    return {
        "reply": reply_text.strip(),
        "channel": channel,
        "model_used": model_name,
        "provider_used": provider,
        "sources_used": list(dict.fromkeys(sources_used))[:4],
        "execution_time_ms": execution_time_ms,
    }
