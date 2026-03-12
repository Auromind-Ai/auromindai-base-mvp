from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import get_db
from app.models.workspace import Workspace
from app.models.workspace import WorkspaceMember
from app.models.user import User

router = APIRouter()


# ============================================================
# Get Token Usage
# ============================================================

@router.get("/tokens")
async def get_tokens(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:

    workspaces = db.query(Workspace).all()

    results = []

    for ws in workspaces:

        owner = db.query(User).filter(User.id == ws.created_by).first()

        results.append({

            "id": str(ws.id),

            "workspace_id": str(ws.id),

            "workspace_name": ws.name,

            "user_email": owner.email if owner else None,

            "plan_type": ws.plan_type,

            "tokens_used":  1000,  # Placeholder for actual token usage calculation

            "custom_token_limit": getattr(ws, "custom_token_limit", None)

        })

    return results


# ============================================================
# Update Token Limit
# ============================================================

@router.patch("/tokens/{workspace_id}/limit")
async def update_token_limit(
    workspace_id: str,
    data: dict,
    db: Session = Depends(get_db)
):

    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    print("Workspace fetched for token limit update:", ws)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    print("Updating token limit for workspace:", workspace_id, "with data:", data.get("custom_token_limit"))
    ws.custom_token_limit = data.get("custom_token_limit")

    db.commit()
    print("Token limit updated for workspace:", workspace_id)
    return {"message": "Token limit updated"}