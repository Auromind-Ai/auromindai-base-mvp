import json
import logging
import re
import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.services.ai.llm_utils import safe_llm_call

logger = logging.getLogger(__name__)


class GmailLeadAIService:
    @classmethod
    def _parse_json_response(cls, text: str) -> Dict[str, Any]:
        """Extract and parse JSON safely from LLM output."""
        try:
            cleaned = text.strip()
            if "```json" in cleaned:
                cleaned = cleaned.split("```json", 1)[1].split("```", 1)[0].strip()
            elif "```" in cleaned:
                cleaned = cleaned.split("```", 1)[1].split("```", 1)[0].strip()
            else:
                # Find JSON object boundaries
                start = cleaned.find("{")
                end = cleaned.rfind("}")
                if start != -1 and end != -1 and end > start:
                    cleaned = cleaned[start : end + 1]

            data = json.loads(cleaned)
            return {
                "is_lead": bool(data.get("is_lead", False)),
                "confidence": float(data.get("confidence", 0.0)),
                "reason": str(data.get("reason", "AI intent evaluation completed")),
                "error": False,
            }
        except Exception as e:
            logger.warning("Failed to parse AI lead intent JSON response: %s", str(e))
            return {
                "is_lead": False,
                "confidence": 0.0,
                "reason": "json_parse_error",
                "error": True,
            }

    @classmethod
    def verify_lead_intent(
        cls,
        subject: str,
        snippet: str,
        body: Optional[str] = None,
        workspace_id: Optional[uuid.UUID | str] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        # Data minimization: Limit snippet length
        clean_subj = (subject or "").strip()[:200]
        clean_snip = (snippet or "").strip()[:500]

        prompt = f"""You are an AI Lead Qualification Engine.
Analyze the email metadata and determine if the sender represents a genuine business lead, customer inquiry, or prospective client seeking products, pricing, demo, quotation, services, or partnership.

Do NOT classify simple thank-you messages, internal administrative notifications, receipts, or personal chit-chat as leads.

Subject: {clean_subj}
Snippet: {clean_snip}

Return strict JSON ONLY in this format:
{{
  "is_lead": true or false,
  "confidence": 0.0 to 1.0,
  "reason": "brief 1-sentence explanation"
}}
"""
        try:         
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop and loop.is_running():
                with ThreadPoolExecutor(max_workers=1) as executor:
                    response = executor.submit(lambda: asyncio.run(safe_llm_call(prompt))).result()
            else:
                response = asyncio.run(safe_llm_call(prompt))

            content = response.get("content", "") if isinstance(response, dict) else str(response)
            parsed = cls._parse_json_response(content)
            return parsed

        except Exception as exc:
            # Safe fail-closed handling without leaking API keys or tokens
            logger.warning(
                "AI lead intent verification failed (fail-closed): %s",
                str(exc)[:150],
            )
            return {
                "is_lead": False,
                "confidence": 0.0,
                "reason": f"ai_call_failed: {str(exc)[:100]}",
                "error": True,
            }
