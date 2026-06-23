from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models.ai_action import AIAction

router = APIRouter()


@router.get("/ai-governance")
async def get_ai_governance(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    
    try:
        actions = db.query(AIAction).filter(
            AIAction.mcp_decision.in_(["block", "escalate"])
        ).all()
        governance_list = []
        for action in actions:
            governance_list.append({
                "id": action.id,
                "workspace_id": action.workspace_id,
                "action_type": action.action_type,
                "mcp_decision": action.mcp_decision,
                "mcp_reason": action.mcp_reason,
                "created_at": action.created_at.isoformat() if action.created_at else None,
            })
        return governance_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching AI governance data: {str(e)}")
