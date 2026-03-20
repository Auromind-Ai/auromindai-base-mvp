from app.services.email_automation.email_automation_engine import AutomationEngine
from app.services.agentic_wiring_service import agentic_wiring_service
from app.routers.auth import get_current_user
from app.models.automation import AutomationFlow
import uuid
from pydantic import BaseModel
from typing import List, Optional
from fastapi import APIRouter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db  # change path if needed

router = APIRouter()

class FlowPromptRequest(BaseModel):
    prompt: str

class FlowSaveRequest(BaseModel):
    id: Optional[str] = None
    name: str
    trigger_type: str
    nodes: list
    edges: list
    status: str = "Active"

router = APIRouter(prefix="/automation", tags=["automation"])

engine = AutomationEngine()

@router.post("/approve")
async def approve_action(
    decision_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    engine.approve_and_execute(db, decision_id)
    return {"status": "approved"}

@router.post("/generate-flow")
async def generate_flow(
    request: FlowPromptRequest,
    current_user=Depends(get_current_user)
):
    """Generates an automation flow graph from a prompt"""
    flow = agentic_wiring_service.generate_flow(request.prompt)
    return flow

@router.get("/flows")
async def get_flows(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Lists all automation flows"""
    return db.query(AutomationFlow).all()

@router.post("/flows")
async def save_flow(
    request: FlowSaveRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Creates or updates a flow"""
    if request.id:
        flow = db.query(AutomationFlow).filter(AutomationFlow.id == request.id).first()
        if flow:
            flow.name = request.name
            flow.trigger_type = request.trigger_type
            flow.nodes = request.nodes
            flow.edges = request.edges
            flow.status = request.status
            db.commit()
            db.refresh(flow)
            return flow

    new_flow = AutomationFlow(
        name=request.name,
        trigger_type=request.trigger_type,
        nodes=request.nodes,
        edges=request.edges,
        status=request.status,
        workspace_id=uuid.uuid4() # Mock workspace
    )
    db.add(new_flow)
    db.commit()
    db.refresh(new_flow)
    return new_flow

@router.delete("/flows/{flow_id}")
async def delete_flow(
    flow_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Deletes a flow"""
    flow = db.query(AutomationFlow).filter(AutomationFlow.id == flow_id).first()
    if flow:
        db.delete(flow)
        db.commit()
    return {"status": "deleted"}