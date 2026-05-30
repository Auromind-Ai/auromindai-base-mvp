from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class FlowPromptRequest(BaseModel):
    prompt: str

class FlowSaveRequest(BaseModel):
    id: Optional[str] = None
    name: str
    trigger_type: str
    nodes: list
    edges: list
    status: str = "Active"

class FlowResponseModel(BaseModel):
    id: UUID          
    name: str
    trigger_type: str
    nodes: list
    edges: list
    status: str
    class Config:
        from_attributes = True

class StatusResponse(BaseModel):
    status: str

class DeleteFlowResponse(BaseModel):
    status: str
    flow_id: UUID

class ApproveResponse(BaseModel):
    status: str

class GenerateFlowResponse(BaseModel):
    nodes: list
    edges: list
