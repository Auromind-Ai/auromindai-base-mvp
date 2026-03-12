from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any

from app.database import get_db
from app.models.ai_action import AIAction

router = APIRouter()


@router.get("/ai_actions")
async def get_ai_actions(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Get all AI actions executed by the system.
    """
    actions = db.query(AIAction).options(joinedload(AIAction.workspace)).all()
    actions_list = []
    for action in actions:
        actions_list.append({
            "id": action.id,
            "workspace": action.workspace.name if action.workspace else None,
            "action_type": action.action_type,
            "intent": action.intent,
            "confidence": action.confidence,
            "mcp_decision": action.mcp_decision,
            "execution_status": action.execution_status,
            "created_at": action.created_at.isoformat() if action.created_at else None,
        })
    return actions_list
