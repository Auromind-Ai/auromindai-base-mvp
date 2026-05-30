from fastapi import APIRouter, Depends, HTTPException
from app.services.email_automation.email_automation_engine import AutomationEngine
from app.services.automations.agentic_wiring_service import agentic_wiring_service
from app.services.automations.flow_validation_service import FlowValidationService
from app.routers.auth import get_current_user
from app.models.automation import AutomationFlow
from app.models.brain import MCPDecision
from uuid import UUID
import uuid
from typing import List
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import verify_workspace_access
from app.schemas.automation import FlowPromptRequest, FlowSaveRequest, FlowResponseModel, DeleteFlowResponse, ApproveResponse, GenerateFlowResponse

router = APIRouter(prefix="/automation", tags=["automation"])
engine = AutomationEngine()

@router.post("/approve", response_model=ApproveResponse)
async def approve_action(
    decision_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
   
    workspace_id = verify_workspace_access(current_user, db)
    decision = db.query(MCPDecision).filter(
        MCPDecision.message_id == str(decision_id),
        MCPDecision.workspace_id == workspace_id,
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    engine.approve_and_execute(db, str(decision_id))
    return {"status": "approved"}

@router.post("/generate-flow", response_model=GenerateFlowResponse)
async def generate_flow(
    request: FlowPromptRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
   
    verify_workspace_access(current_user, db)
    
    flow = agentic_wiring_service.generate_flow(request.prompt)
    return flow

@router.get("/flows", response_model=List[FlowResponseModel])
async def get_flows(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    workspace_id = verify_workspace_access(current_user, db)
    
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
    
    workspace_id = verify_workspace_access(current_user, db)
    
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
            AutomationFlow.workspace_id == workspace_id 
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
        workspace_id=workspace_id 
    )
    db.add(new_flow)
    db.commit()
    db.refresh(new_flow)
    return new_flow

@router.get("/flows/{flow_id}", response_model=FlowResponseModel)
async def get_flow(
    flow_id:  UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    
    workspace_id = verify_workspace_access(current_user, db)
    
    # Query flow with workspace boundary check
    flow = db.query(AutomationFlow).filter(
        AutomationFlow.id == flow_id,
        AutomationFlow.workspace_id == workspace_id 
    ).first()
    
    if not flow:
        raise HTTPException(
            status_code=403,
            detail="Flow not found or you do not have permission to access it"
        )
    
    return flow

@router.delete("/flows/{flow_id}", response_model=DeleteFlowResponse)
async def delete_flow(
    flow_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    
    workspace_id = verify_workspace_access(current_user, db)
    
    # Query flow with workspace boundary check
    flow = db.query(AutomationFlow).filter(
        AutomationFlow.id == flow_id,
        AutomationFlow.workspace_id == workspace_id  
    ).first()
    
    if not flow:
        raise HTTPException(
            status_code=403,
            detail="Flow not found or you do not have permission to delete it"
        )
    
    db.delete(flow)
    db.commit()
    
    return {"status": "deleted", "flow_id": flow_id}