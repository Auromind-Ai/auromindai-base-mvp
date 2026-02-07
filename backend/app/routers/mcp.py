from fastapi import APIRouter, Depends, HTTPException,Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import workspace
from app.routers.auth import get_current_user
from app.services.mcp_service import MCPService
from typing import Dict, Any, Optional
import uuid

router = APIRouter()

class EvaluateActionRequest(BaseModel):
    action_type: str
    intent: str
    context: Dict[str, Any]
    confidence: float = 0.0
    workspace_id: str

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
        result = MCPService.evaluate_action(
            db=db,
            workspace_id=uuid.UUID(request.workspace_id),
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
    workspace_id: str,
    limit: int = 50,
    decision: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get AI actions log for a workspace"""
    try:
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
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get MCP rules for a workspace"""
    rules = MCPService.get_rules(db=db, workspace_id=uuid.UUID(workspace_id))
    return {"rules": rules}


@router.put("/rules")
async def update_rules(
    workspace_id: str,
    rules: Dict[str, Any]=Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
    
):
    """Update MCP rules for a workspace"""
    result = MCPService.update_rules(db, uuid.UUID(workspace_id), rules)
    return result 
