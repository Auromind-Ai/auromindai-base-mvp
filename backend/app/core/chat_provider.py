# app/core/chat_provider.py — FULL FILE

import asyncio
from groq import Groq

from app.services.llm_router import LLMRouter
from app.services.chat_service import ChatService, ChatServiceConfig
from app.core.config import settings
from app.core.logger import logger

#  LLMRouter singleton
_llm_router_instance: LLMRouter | None = None
_router_lock = asyncio.Lock()

async def get_llm_router() -> LLMRouter:
    global _llm_router_instance
    if _llm_router_instance is None:
        async with _router_lock:
            if _llm_router_instance is None:
                _llm_router_instance = LLMRouter()
                logger.info("LLMRouter singleton initialized")
    return _llm_router_instance



_chat_service_instance: ChatService | None = None
_chat_lock = asyncio.Lock()
async def get_chat_service() -> ChatService:
    global _chat_service_instance
    if _chat_service_instance is None:
        async with _chat_lock:
            if _chat_service_instance is None:
                GROQ_API_KEY = settings.GROQ_API_KEY

                groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

                config = ChatServiceConfig(
                    groq_client=groq_client,
                )
                _chat_service_instance = ChatService(config)
                logger.info("ChatService singleton initialized")
    return _chat_service_instance