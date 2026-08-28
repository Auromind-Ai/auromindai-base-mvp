from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID

class FlowPromptRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=10000, description="Flow generation prompt")

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        v_str = v.strip()
        if len(v_str) < 3:
            raise ValueError("Prompt must be at least 3 characters.")
        return v_str

class FlowSaveRequest(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=255)
    trigger_type: str = Field(..., min_length=1, max_length=100)
    nodes: list = Field(default_factory=list)
    edges: list = Field(default_factory=list)
    status: str = Field(default="Active", pattern="^(Active|Inactive|Draft)$")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v_str = v.strip()
        if not v_str:
            raise ValueError("Flow name cannot be empty or whitespace.")
        return v_str

    @field_validator("nodes", "edges")
    @classmethod
    def validate_graph_size(cls, v: list) -> list:
        if len(v) > 500:
            raise ValueError("Flow graph exceeds maximum supported elements (500).")
        return v

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

class FlowStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(Active|Inactive|Draft)$")

class GenerateFlowResponse(BaseModel):
    nodes: list
    edges: list
