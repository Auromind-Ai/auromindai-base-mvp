from fastapi import APIRouter, Depends, HTTPException
import logging
logger = logging.getLogger(__name__)
from app.services.email_automation.email_automation_engine import AutomationEngine
from app.services.automations.agentic_wiring_service import agentic_wiring_service
from app.services.automations.flow_validation_service import FlowValidationService
from app.routers.auth import get_current_user
from app.models.automation import AutomationFlow
from app.models.brain import MCPDecision
from uuid import UUID
import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import verify_workspace_access
from app.schemas.automation import FlowPromptRequest, FlowSaveRequest, FlowResponseModel, DeleteFlowResponse, ApproveResponse, GenerateFlowResponse, FlowStatusUpdateRequest
from sqlalchemy import func
from app.services.billing.entitlement_service import EntitlementService
from app.models.flow_pack import FlowPackPurchase

router = APIRouter(prefix="/automation", tags=["automation"])
engine = AutomationEngine()

@router.post("/approve", response_model=ApproveResponse)
async def approve_action(
    decision_id: UUID,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    verified_workspace_id = verify_workspace_access(current_user, db, workspace_id)
    decision = db.query(MCPDecision).filter(
        MCPDecision.message_id == str(decision_id),
        MCPDecision.workspace_id == str(verified_workspace_id),
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found in this workspace")
    
    engine.approve_and_execute(db, str(decision_id))
    return {"status": "approved"}

@router.post("/generate-flow", response_model=GenerateFlowResponse)
async def generate_flow(
    request: FlowPromptRequest,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    verified_workspace_id = verify_workspace_access(current_user, db, workspace_id)
    
    try:
        flow = await agentic_wiring_service.generate_flow(
            prompt=request.prompt,
            db=db,
            workspace_id=str(verified_workspace_id),
            user_id=current_user.id
        )
        return flow
    except Exception as e:
        logger.exception("[Router] Flow generation failed: %s", e)
        from app.core.exceptions import AIProviderError, get_ai_provider_error_details
        if isinstance(e, AIProviderError):
            raise e
        safe_msg, status_code = get_ai_provider_error_details(e, operation="flow")
        raise AIProviderError(safe_msg, status_code=status_code)

@router.get("/flows", response_model=List[FlowResponseModel])
async def get_flows(
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    verified_workspace_id = verify_workspace_access(current_user, db, workspace_id)
    ws_uuid = uuid.UUID(verified_workspace_id) if isinstance(verified_workspace_id, str) else verified_workspace_id
    
    flows = db.query(AutomationFlow).filter(
        AutomationFlow.workspace_id == ws_uuid
    ).all()
    
    return flows

@router.post("/flows", response_model=FlowResponseModel)
async def save_flow(
    request: FlowSaveRequest,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    verified_workspace_id = verify_workspace_access(current_user, db, workspace_id)
    ws_uuid = uuid.UUID(verified_workspace_id) if isinstance(verified_workspace_id, str) else verified_workspace_id
    
    # Validate flow structure
    validation = FlowValidationService.validate_flow(request.nodes, request.edges)
    if not validation["is_valid"]:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Invalid flow structure",
                "errors": validation["errors"],
                "warnings": validation["warnings"],
            },
        )


    if request.id:
        # Update existing flow
        try:
            flow_uuid = uuid.UUID(request.id) if isinstance(request.id, str) else request.id
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid flow UUID format")

        flow = db.query(AutomationFlow).filter(
            AutomationFlow.id == flow_uuid,
            AutomationFlow.workspace_id == workspace_id 
        ).first()
        
        if not flow:
            raise HTTPException(
                status_code=403,
                detail="Flow not found or you do not have permission to edit it"
            )
        
        # Update fields
        if request.status and request.status.lower() == "active" and (not flow.status or flow.status.lower() != "active"):
            ent_check = EntitlementService.check_entitlement(db, workspace_id, "automation")
            if not ent_check["allowed"]:
                EntitlementService.raise_entitlement_exceeded(
                    db, workspace_id, "automation", ent_check["limit"], 50
                )

        flow.name = request.name
        flow.trigger_type = request.trigger_type
        flow.nodes = request.nodes
        flow.edges = request.edges
        flow.status = request.status
        db.commit()
        db.refresh(flow)
        return flow
    
    # Create new flow
    flow_q = EntitlementService.get_flow_quota(db, workspace_id)
    if flow_q["total_quota"] != -1 and flow_q["used_quota"] >= flow_q["total_quota"]:
        EntitlementService.raise_entitlement_exceeded(
            db, workspace_id, "flow", flow_q["total_quota"], 10,
            custom_message=f"You have reached your limit of {flow_q['total_quota']} flow executions. Upgrade your plan or purchase additional flow packs."
        )

    if request.status and request.status.lower() == "active":
        ent_check = EntitlementService.check_entitlement(db, workspace_id, "automation")
        if not ent_check["allowed"]:
            EntitlementService.raise_entitlement_exceeded(
                db, workspace_id, "automation", ent_check["limit"], 50
            )
    
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

    EntitlementService.check_flow_quota_warnings(db, workspace_id)

    return new_flow

@router.get("/flows/{flow_id}", response_model=FlowResponseModel)
async def get_flow(
    flow_id: UUID,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    verified_workspace_id = verify_workspace_access(current_user, db, workspace_id)
    ws_uuid = uuid.UUID(verified_workspace_id) if isinstance(verified_workspace_id, str) else verified_workspace_id
    
    # Query flow with workspace boundary check
    flow = db.query(AutomationFlow).filter(
        AutomationFlow.id == flow_id,
        AutomationFlow.workspace_id == ws_uuid 
    ).first()
    
    if not flow:
        raise HTTPException(
            status_code=404,
            detail="Flow not found or you do not have permission to access it"
        )
    
    return flow

@router.delete("/flows/{flow_id}", response_model=DeleteFlowResponse)
async def delete_flow(
    flow_id: UUID,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    verified_workspace_id = verify_workspace_access(current_user, db, workspace_id)
    ws_uuid = uuid.UUID(verified_workspace_id) if isinstance(verified_workspace_id, str) else verified_workspace_id
    
    # Query flow with workspace boundary check
    flow = db.query(AutomationFlow).filter(
        AutomationFlow.id == flow_id,
        AutomationFlow.workspace_id == ws_uuid  
    ).first()
    
    if not flow:
        raise HTTPException(
            status_code=404,
            detail="Flow not found or you do not have permission to delete it"
        )
    
    db.delete(flow)
    db.commit()
    
    return {"status": "deleted", "flow_id": flow_id}

@router.patch("/flows/{flow_id}/status", response_model=FlowResponseModel)
async def update_flow_status(
    flow_id: UUID,
    request: FlowStatusUpdateRequest,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    verified_workspace_id = verify_workspace_access(current_user, db, workspace_id)
    ws_uuid = uuid.UUID(verified_workspace_id) if isinstance(verified_workspace_id, str) else verified_workspace_id

    flow = db.query(AutomationFlow).filter(
        AutomationFlow.id == flow_id,
        AutomationFlow.workspace_id == ws_uuid
    ).first()

    if not flow:
        raise HTTPException(
            status_code=404,
            detail="Flow not found or you do not have permission to update it"
        )

    if request.status and request.status.lower() == "active" and (not flow.status or flow.status.lower() != "active"):
        ent_check = EntitlementService.check_entitlement(db, ws_uuid, "automation")
        if not ent_check["allowed"]:
            EntitlementService.raise_entitlement_exceeded(
                db, ws_uuid, "automation", ent_check["limit"], 50
            )

    flow.status = request.status
    db.commit()
    db.refresh(flow)

    EntitlementService.check_flow_quota_warnings(db, ws_uuid)

    return flow