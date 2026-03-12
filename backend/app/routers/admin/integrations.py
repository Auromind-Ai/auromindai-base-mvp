from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import get_db
from app.models.integration import Integration
from app.models.workspace import Workspace

router = APIRouter()


@router.get("/integrations")
async def get_integrations(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Get integrations per workspace.
    """
    try:
        integrations = db.query(Integration, Workspace.name.label("workspace_name")).join(
            Workspace, Integration.workspace_id == Workspace.id
        ).all()
        integrations_list = []
        for integration, workspace_name in integrations:
            integrations_list.append({
                "id": integration.id,
                "workspace_name": workspace_name,
                "integration_type": integration.integration_type,
                "connected_email": integration.connected_email,
                "is_active": integration.is_active,
                "token_expiry": integration.token_expiry.isoformat() if integration.token_expiry else None,
                "created_at": integration.created_at.isoformat() if integration.created_at else None,
            })
        return integrations_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching integrations: {str(e)}")
