from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.routers.auth import get_current_user
from app.services.mcp_service import MCPService
from typing import Dict, Any, Optional
import uuid
from app.models.workspace import WorkspaceMember
from app.models.ai_action import AIAction
from app.core.security import verify_workspace_access

router = APIRouter()


class EvaluateActionRequest(BaseModel):
    action_type: str
    intent: str
    context: Dict[str, Any]
    confidence: float = 0.0

class OverrideDecisionRequest(BaseModel):
    action_id: str
    approved: bool

@router.post("/evaluate")
async def evaluate_action(
    request: EvaluateActionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Evaluate an AI action through MCP governance layer
    Returns: ALLOW, ESCALATE, or BLOCK
    """
    try:
        workspace_id = verify_workspace_access(current_user, db)
        result = MCPService.evaluate_action(
            db=db,
            workspace_id=uuid.UUID(workspace_id),
            action_type=request.action_type,
            intent=request.intent,
            context=request.context,
            confidence=request.confidence
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/actions")
async def get_ai_actions(
    limit: int = 50,
    decision: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get AI actions log for the authenticated workspace"""
    try:
        workspace_id = verify_workspace_access(current_user, db)
        actions = MCPService.get_ai_actions(
            db=db,
            workspace_id=uuid.UUID(workspace_id),
            limit=limit,
            decision_filter=decision
        )
        return {"actions": actions, "count": len(actions)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/override")
async def override_decision(
    request: OverrideDecisionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Human override for ESCALATE decisions"""
    try:
        workspace_id = verify_workspace_access(current_user, db)
        action = db.query(AIAction).filter(
            AIAction.id == uuid.UUID(request.action_id),
            AIAction.workspace_id == workspace_id,
        ).first()
        if not action:
            raise HTTPException(status_code=404, detail="Action not found")
        result = MCPService.override_decision(
            db=db,
            action_id=uuid.UUID(request.action_id),
            approved=request.approved
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/rules")
async def get_rules(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get MCP rules for the authenticated workspace"""
    workspace_id = verify_workspace_access(current_user, db)
    rules = MCPService.get_rules(uuid.UUID(workspace_id))
    return {"rules": rules}

@router.put("/rules")
async def update_rules(
    rules: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update MCP rules for the authenticated workspace"""
    workspace_id = verify_workspace_access(current_user, db)
    result = MCPService.update_rules(db, uuid.UUID(workspace_id), rules)
    return result