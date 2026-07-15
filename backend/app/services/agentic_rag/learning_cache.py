import logging
from typing import Any

logger = logging.getLogger(__name__)


def get_learning_profile(*, workspace_id: str | None = None) -> dict[str, Any]:
    if not workspace_id:
        return {}
    try:
        from app.database import SessionLocal
        from app.services.agentic_rag.reinforcement import ReinforcementEngine
        with SessionLocal() as db:
            engine = ReinforcementEngine(db, workspace_id=workspace_id)
            return engine.run_learning_cycle()
    except Exception as e:
        logger.exception("Failed to dynamically compute learning profile for workspace %s: %s", workspace_id, e)
        return {}
