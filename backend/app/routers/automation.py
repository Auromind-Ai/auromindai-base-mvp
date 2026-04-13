from fastapi import APIRouter, Depends, HTTPException, Query
from app.services.email_automation.email_automation_engine import AutomationEngine
from app.services.agentic_wiring_service import agentic_wiring_service
from app.services.flow_validation_service import FlowValidationService
from app.routers.auth import get_current_user
from app.models.automation import AutomationFlow
from app.models.workspace import WorkspaceMember
import uuid
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from app.database import get_db  # change path if needed

router = APIRouter()

class FlowPromptRequest(BaseModel):
    prompt: str
    workspace_id: str

class FlowSaveRequest(BaseModel):
    id: Optional[str] = None
    name: str
    trigger_type: str
    nodes: list
    edges: list
    status: str = "Active"
    workspace_id: str

class FlowResponseModel(BaseModel):
    id: uuid.UUID        
    workspace_id: uuid.UUID
    name: str
    trigger_type: str
    nodes: list
    edges: list
    status: str
    class Config:
        from_attributes = True

router = APIRouter(prefix="/automation", tags=["automation"])

engine = AutomationEngine()


def verify_workspace_access(workspace_id: str, current_user, db: Session):
    """Verify user has access to workspace. Returns user membership."""
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id,
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this workspace"
        )
    
    return membership


@router.post("/approve")
async def approve_action(
    decision_id: str,
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Approve and execute an automation action (with workspace verification)"""
    # Verify workspace access
    verify_workspace_access(workspace_id, current_user, db)
    
    engine.approve_and_execute(db, decision_id)
    return {"status": "approved"}

@router.post("/generate-flow")
async def generate_flow(
    request: FlowPromptRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Generates an automation flow graph from a prompt (with workspace verification)"""
    # Verify workspace access
    verify_workspace_access(request.workspace_id, current_user, db)
    
    flow = agentic_wiring_service.generate_flow(request.prompt)
    return flow

@router.get("/flows", response_model=List[FlowResponseModel])
async def get_flows(
    workspace_id: str = Query(..., description="Workspace ID"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Lists all automation flows for a workspace (enforced access control)"""
    # Verify workspace access
    verify_workspace_access(workspace_id, current_user, db)
    
    # Query flows filtered by workspace_id (security boundary)
    flows = db.query(AutomationFlow).filter(
        AutomationFlow.workspace_id == workspace_id
    ).all()
    
    return flows

@router.post("/flows", response_model=FlowResponseModel)
async def save_flow(
    request: FlowSaveRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Creates or updates a flow (with workspace verification)"""
    # Verify workspace access
    verify_workspace_access(request.workspace_id, current_user, db)
    
    # Validate flow structure
    validation = FlowValidationService.validate_flow(request.nodes, request.edges)
    if not validation["is_valid"]:
        raise HTTPException(
            status_code=400,
            detail={
                "errors": validation["errors"],
                "warnings": validation["warnings"],
            },
        )

    if request.id:
        # Update existing flow
        flow = db.query(AutomationFlow).filter(
            AutomationFlow.id == request.id,
            AutomationFlow.workspace_id == request.workspace_id  # CRITICAL: Verify workspace ownership
        ).first()
        
        if not flow:
            raise HTTPException(
                status_code=403,
                detail="Flow not found or you do not have permission to edit it"
            )
        
        # Update fields
        flow.name = request.name
        flow.trigger_type = request.trigger_type
        flow.nodes = request.nodes
        flow.edges = request.edges
        flow.status = request.status
        db.commit()
        db.refresh(flow)
        return flow
    
    # Create new flow
    new_flow = AutomationFlow(
        id=uuid.uuid4(),
        name=request.name,
        trigger_type=request.trigger_type,
        nodes=request.nodes,
        edges=request.edges,
        status=request.status,
        workspace_id=request.workspace_id  # Set from request (already verified)
    )
    db.add(new_flow)
    db.commit()
    db.refresh(new_flow)
    return new_flow

@router.get("/flows/{flow_id}", response_model=FlowResponseModel)
async def get_flow(
    flow_id: str,
    workspace_id: str = Query(..., description="Workspace ID"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get a specific flow (with workspace verification)"""
    # Verify workspace access
    verify_workspace_access(workspace_id, current_user, db)
    
    # Query flow with workspace boundary check
    flow = db.query(AutomationFlow).filter(
        AutomationFlow.id == flow_id,
        AutomationFlow.workspace_id == workspace_id  # CRITICAL: Enforce workspace boundary
    ).first()
    
    if not flow:
        raise HTTPException(
            status_code=403,
            detail="Flow not found or you do not have permission to access it"
        )
    
    return flow

@router.delete("/flows/{flow_id}")
async def delete_flow(
    flow_id: str,
    workspace_id: str = Query(..., description="Workspace ID"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Deletes a flow (with workspace verification)"""
    # Verify workspace access
    verify_workspace_access(workspace_id, current_user, db)
    
    # Query flow with workspace boundary check
    flow = db.query(AutomationFlow).filter(
        AutomationFlow.id == flow_id,
        AutomationFlow.workspace_id == workspace_id  # CRITICAL: Enforce workspace boundary
    ).first()
    
    if not flow:
        raise HTTPException(
            status_code=403,
            detail="Flow not found or you do not have permission to delete it"
        )
    
    db.delete(flow)
    db.commit()
    
    return {"status": "deleted", "flow_id": flow_id}
