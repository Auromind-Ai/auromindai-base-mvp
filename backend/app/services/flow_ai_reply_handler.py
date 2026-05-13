
import logging
from sqlalchemy.orm import Session

from app.services.inbox_agents.orchestration_layer import AgentOrchestration
from app.services.inbox_agents.memory_service import MemoryService
from app.services.inbox_agents.llm_client import LLMClient
from app.services.inbox_agents.escalation_queue import EscalationQueue
from app.core.config import settings

logger = logging.getLogger(__name__)


# ── Helper: build a one-off orchestrator scoped to this DB session ────────────

def _get_orchestrator(db: Session) -> AgentOrchestration:
    orchestrator = AgentOrchestration(db=db)

    # EscalationQueue needs the same DB session
    orchestrator.escalation_queue = EscalationQueue(db=db)

    return orchestrator

async def execute_ai_reply(
    *,
    db: Session,
    workspace_id: str,
    contact_phone: str,         
    user_message: str,           
    channel: str = "twilio",   
    flow_context: dict = None,  
) -> dict:
    flow_context = flow_context or {}

    logger.info(
        "[AI Reply] Executing brain step",
        extra={
            "workspace_id": workspace_id,
            "contact": contact_phone,
            "channel": channel,
        }
    )

    try:
        # ── Build payload (mirrors what handle_twilio_webhook produces) ────────
        payload = {
            # normalize_message reads these keys for twilio/whatsapp channel
            "from": contact_phone,
            "body": user_message,
            "workspace_id": workspace_id,
            # optional extras from the flow node config
            **{k: v for k, v in flow_context.items() if k not in ("from", "body")},
        }

        # ── Run orchestration ─────
        orchestrator = _get_orchestrator(db)
        result = await orchestrator.process_message(payload=payload, channel=channel)

        # result shape: {"text": "...", "metadata": {...}}
        response_text = result.get("text") or result.get("response_text") or ""
        metadata = result.get("metadata") or {}

        logger.info(
            "[AI Reply] Brain step completed",
            extra={
                "workspace_id": workspace_id,
                "action": metadata.get("action"),
                "stage": metadata.get("stage"),
            }
        )

        return {
            "status": "sent",
            "response_text": response_text,
            "action": metadata.get("action", "unknown"),
            "stage": metadata.get("stage", "lead"),
            "escalated": metadata.get("escalate", False),
            "closed": metadata.get("close", False),
        }

    except Exception:
        logger.error(
            "[AI Reply] Brain step failed",
            exc_info=True,
            extra={"workspace_id": workspace_id, "contact": contact_phone}
        )
        return {
            "status": "error",
            "response_text": "",
            "action": "error",
            "stage": "lead",
            "escalated": False,
            "closed": False,
        }

