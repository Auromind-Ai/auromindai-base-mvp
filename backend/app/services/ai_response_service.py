from typing import List, Dict, Optional, Any
import json
import logging
from datetime import datetime

import redis.asyncio as redis
from anthropic import AsyncAnthropic    
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.services.platform_settings_service import get_setting
from app.services.agentic_rag.vector_store_service import VectorStoreService
from app import models, schemas
from app.services.agentic_rag.rag_service import get_rag_service
from app import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AIResponseService:
    def __init__(self):
        self.rag_service = get_rag_service()
        self.orchestrator = self.rag_service
        self._redis: Optional[redis.Redis] = None

    def _get_anthropic_client(self, db: Session) -> AsyncAnthropic:
        """
        Creates an AsyncAnthropic client using the API key stored in DB.
        Called fresh on each request so admin credential changes are instant.
        """
        api_key = get_setting(db, "anthropic_api_key")
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="Anthropic API key not configured. Please set it in Admin → Settings."
            )
        return AsyncAnthropic(api_key=api_key)

    async def _get_redis(self, db: Session) -> Optional[redis.Redis]:
        """Lazy Redis connection using URL from DB settings (or env fallback)."""
        if self._redis is not None:
            return self._redis
        try:
            redis_url = get_setting(db, "redis_url", "redis://localhost:6379")
            self._redis = redis.from_url(redis_url)
            return self._redis
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}")
            self.redis = None
        self.orchestrator = None 
        # self.vector_store = VectorStoreService() # Placeholder for future vector search

    async def enrich_context(self, db: Session, conversation_id: str) -> Dict[str, Any]:
        """
        Gathers all necessary context for the AI:
        - Conversation & lead details
        - Recent message history (last 10)
        - Company knowledge via RAG
        """
        conversation = db.query(models.Conversation).filter(
            models.Conversation.id == conversation_id
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Recent messages — oldest first
        messages = (
            db.query(models.Message)
            .filter(models.Message.conversation_id == conversation_id)
            .order_by(models.Message.timestamp.desc())
            .limit(10)
            .all()
        )
        messages.reverse()

        history_str = "\n".join(
            [f"{m.sender_type}: {m.content}" for m in messages]
        )

        last_user_msg = next(
            (m.content for m in reversed(messages) if m.sender_type == "USER"), ""
        )

        # RAG knowledge retrieval
        knowledge_snippet = ""

        if last_user_msg and self.orchestrator:
            try:
                retrieval = self.orchestrator.retrieval

                result = retrieval.retrieve_context(
                    db=db,
                    workspace_id="default_workspace_id",
                    query=last_user_msg
                )

                knowledge_snippet = result.get("context", "")

            except Exception:
                logger.warning("Failed to retrieve RAG context")

        return {
            "lead_name": conversation.contact_name or "Potential Customer",
            "lead_phone": conversation.external_id,
            "channel": conversation.channel,
            "conversation_history": history_str,
            "last_message": last_user_msg,
            "conversation_id": conversation_id,
            "crm_data": {},          # Placeholder
            "calendar_slots": [],    # Placeholder
            "company_knowledge": knowledge_snippet,
        }

    # ------------------------------------------------------------------
    # Variant generation
    # ------------------------------------------------------------------

    async def generate_variants(self, db: Session, conversation_id: str) -> Dict[str, Any]:
        """
        Generates 3 response variants using Claude.
        All AI config (model, temperature, max_tokens, api_key) read from DB.
        """
        context = await self.enrich_context(db, conversation_id)

        anthropic    = self._get_anthropic_client(db)
        model_name   = get_setting(db, "model_name",   "claude-3-5-sonnet-20241022")
        temperature  = get_setting(db, "temperature",  0.7)
        max_tokens   = get_setting(db, "max_tokens",   1000)
        ai_enabled   = get_setting(db, "ai_enabled",   True)

        if not ai_enabled:
            raise HTTPException(status_code=503, detail="AI is currently disabled by the administrator.")

        system_prompt = f"""
You are AuromindAI, an expert sales copilot.

CONTEXT:
Customer: {context['lead_name']}
CRM Info: {context.get('crm_data')}
Calendar Availability: {context.get('calendar_slots')}

Conversation History:
{context['conversation_history']}

Knowledge Base:
{context['company_knowledge']}

Generate 3 response variants for the last customer message.
If a response requires an action (e.g. check calendar, update CRM), suggest it in action_suggestion.

Return ONLY valid JSON — no markdown, no explanation:
{{
    "variants": [
        {{
            "strategy": "strategy_name",
            "label": "Strategy Label",
            "message": "Message text...",
            "reasoning": "Why this works...",
            "action_suggestion": "Optional tool action"
        }}
    ],
    "insight": "Brief analysis of customer intent."
}}
"""
        user_prompt = f"Generate 3 response variants for: {context['last_message']}"

        try:
            response = await anthropic.messages.create(
                model=model_name,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            raw = response.content[0].text.strip()

            # Strip accidental markdown fences from model output
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()

            return json.loads(raw)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude JSON response: {e}")
            return {"variants": [], "insight": "AI returned an unexpected format."}
        except Exception as e:
            logger.error(f"Error generating AI variants: {e}")
            return {"variants": [], "insight": "Error connecting to AI service."}

    # ------------------------------------------------------------------
    # Streaming
    # ------------------------------------------------------------------

    async def generate_stream(self, db: Session, conversation_id: str):
        """
        Streams the raw Claude response token-by-token.
        Useful for real-time typing-feel in the UI.
        """
        context = await self.enrich_context(db, conversation_id)

        anthropic   = self._get_anthropic_client(db)
        model_name  = get_setting(db, "model_name",  "claude-3-5-sonnet-20241022")
        temperature = get_setting(db, "temperature", 0.7)
        max_tokens  = get_setting(db, "max_tokens",  1000)
        ai_enabled  = get_setting(db, "ai_enabled",  True)

        if not ai_enabled:
            raise HTTPException(status_code=503, detail="AI is currently disabled by the administrator.")

        system_prompt = f"""
You are AuromindAI, an expert sales copilot.
Customer: {context['lead_name']}
History:
{context['conversation_history']}
Knowledge Base:
{context['company_knowledge']}
Reply naturally and helpfully to the customer's last message.
"""

        try:
            async with anthropic.messages.stream(
                model=model_name,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": context["last_message"]}],
            ) as stream:
                async for text in stream.text_stream:
                    yield text
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield "[Error: Could not stream AI response]"
