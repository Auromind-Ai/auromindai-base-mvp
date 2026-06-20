import uuid
from uuid import UUID
from typing import Any

def normalize_workspace_id(workspace_id: Any) -> UUID:
    """
    Safely normalize a workspace ID (either uuid.UUID or str) to uuid.UUID.
    Raises ValueError if the workspace ID is invalid or cannot be parsed.
    """
    if isinstance(workspace_id, UUID):
        return workspace_id
    if isinstance(workspace_id, str):
        try:
            return uuid.UUID(workspace_id)
        except (ValueError, AttributeError) as exc:
            raise ValueError(f"Invalid workspace ID format: {workspace_id}") from exc
    raise ValueError(f"Workspace ID must be uuid.UUID or str, got {type(workspace_id)}")
