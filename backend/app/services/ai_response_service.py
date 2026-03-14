from typing import List, Dict, Optional, Any
import os
import json
import logging
from datetime import datetime
import asyncio

import redis.asyncio as redis
from anthropic import AsyncAnthropic
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.services.platform_settings_service import get_setting
from app.services.rag_service import get_rag_service
from app.services.vector_store_service import VectorStoreService
from app import models, schemas

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIResponseService:
    def __init__(self):
        self.anthropic = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.redis = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
        self.rag_service = get_rag_service()
        # self.vector_store = VectorStoreService() # Placeholder for future vector search

    async def enrich_context(self, db: Session, conversation_id: str) -> Dict[str, Any]:
        """
        Gathers all necessary context for the AI:
        - Lead details
        - Conversation history
        - Company knowledge (from RAG/Vector Store)
        - Similar past deals (Future)
        """
        # 1. Fetch Conversation & Lead
        conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # 2. Get Recent Messages (last 10)
        messages = db.query(models.Message).filter(
            models.Message.conversation_id == conversation_id
        ).order_by(models.Message.timestamp.desc()).limit(10).all()
        messages.reverse() # Oldest first

        history_str = "\n".join([f"{m.sender_type}: {m.content}" for m in messages])

        # 3. Get Company Knowledge (Basic RAG for now)
        # We can search based on the last user message
        last_user_msg = next((m.content for m in reversed(messages) if m.sender_type == 'USER'), "")
        knowledge_snippet = ""
        if last_user_msg:
             # This is a synchronous call in RAGService, might want to make it async or run in executor
             # For now, we'll keep it simple or skip if performance is key
             try:
                 knowledge_snippet = self.rag_service.retrieve_context(last_user_msg, "default_workspace_id", db) # Placeholder workspace
             except Exception:
                 logger.warning("Failed to retrieve RAG context")

        # 4. Construct Context Object
        return {
            "lead_name": conversation.contact_name or "Potential Customer",
            "lead_phone": conversation.external_id,
            "channel": conversation.channel,
            "conversation_history": history_str,
            "last_message": last_user_msg,
            "conversation_id": conversation_id,
            "lead_name": contact_name,
            "lead_phone": contact_phone,
            "conversation_history": history,
            "last_message": last_message,
            "company_knowledge": company_knowledge,
            "crm_data": mcp_context.get('crm_lead', {}),
            "calendar_slots": mcp_context.get('calendar_slots', []),
            "mcp_tools": orchestrator.get_tool_definitions() # Pass tools to Claude
        }

    async def generate_variants(self, db: Session, conversation_id: str) -> Dict[str, Any]:
        """
        Generates 3 response variants using Claude.
        """
        context = await self.enrich_context(db, conversation_id)
        
        # Get AI settings from platform config
        temperature = get_setting(db, "temperature", 0.7)
        max_tokens = get_setting(db, "max_tokens", 1000)
        
        # Define Strategies
        strategies = [
            {"name": "direct_answer", "label": "💡 Direct Answer", "desc": "Concise, direct response."},
            {"name": "consultative", "label": "🤔 Consultative", "desc": "Ask clarifying questions."},
            {"name": "value_focused", "label": "💎 Value Focused", "desc": "Highlight ROI and benefits."}
        ]

        # Check if we have tools to call
        tools = context.get('mcp_tools', [])

        system_prompt = f"""
        You are AuromindAI, an expert sales copilot.
        
        CONTEXT:
        Customer: {context['lead_name']}
        CRM Info: {context.get('crm_data')}
        Calendar Availability: {context.get('calendar_slots')}
        
        History:
        {context['conversation_history']}
        
        Knowledge Base:
        {context['company_knowledge']}
        
        Generate 3 response variants.
        If a response requires an action (e.g. check calendar, update CRM), invoke the tool in your reasoning or suggest it.
        
        Return JSON:
        {{
            "variants": [
                {{
                    "strategy": "strategy_name",
                    "label": "Strategy Label",
                    "message": "Message text...",
                    "reasoning": "Why this works...",
                    "action_suggestion": "Suggested tool action (optional)" 
                }}
            ],
            "insight": "Analysis of intent."
        }}
        """
        
        user_prompt = f"Generate 3 variants for last message: {context['last_message']}"

        try:
            # We are NOT using Claude's native tool use API for the *variants* generation here 
            # because we want 3 text variants to show the user first.
            # However, if we wanted the agent to autonomously act, we would use tools=[...].
            # For this "Copilot" mode, we suggest actions.
            
            # Call Claude
            response = await self.anthropic.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
                # tools=tools # We could pass tools if we wanted functional tool calls
            )
            
            content = response.content[0].text
            parsed_content = json.loads(content)
            
            return parsed_content

        except Exception as e:
            logger.error(f"Error generating AI variants: {e}")
            # Fallback
            return {
                "variants": [],
                "insight": "Error connecting to AI service."
            }

    async def generate_stream(self, db: Session, conversation_id: str):
        """
        Generator for streaming the raw Claude response.
        Useful for real-time UI feel.
        """
        context = await self.enrich_context(db, conversation_id)
        
        system_prompt = f"""... (Same prompt as above) ..."""
        
        # TODO: Implement streaming logic if needed for raw text
        # For JSON variants, standard request-response is usually better 
        # unless we stream the JSON creation token-by-token.
        pass
