import logging
from typing import Any

logger = logging.getLogger(__name__)


def get_learning_profile(*, workspace_id: str | None = None) -> dict[str, Any]:
    if workspace_id:
        logger.debug(
            "Learning profile requested for workspace %s but cache is disabled",
            workspace_id,
        )
    return {}
