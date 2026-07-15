import uuid
from typing import Any
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.workspace import Workspace
from app.services.billing.utils import normalize_workspace_id

def verify_admin_workspace(
    db: Session,
    workspace_id: Any,
) -> uuid.UUID:
    
    if not workspace_id:
        raise HTTPException(
            status_code=400,
            detail="Workspace context is required for administrative operations."
        )
        
    try:
        ws_uuid = normalize_workspace_id(workspace_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        )
        
    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not workspace:
        raise HTTPException(
            status_code=404,
            detail=f"Workspace not found: {ws_uuid}"
        )
        
    return ws_uuid
