# from fastapi import APIRouter, Depends, HTTPException
# from sqlalchemy.orm import Session
# from pydantic import BaseModel
# from app.database import get_db
# from app.routers.auth import get_current_user
# from app.services.orchestration_service import OrchestrationService
# from typing import Dict, Any, Optional
# import uuid

# router = APIRouter()

# class SimulationRequest(BaseModel):
#     action_type: str
#     intent: str
#     workspace_id: str
#     metadata: Optional[Dict[str, Any]] = None

# @router.post("/run")
# async def run_simulation(
#     request: SimulationRequest,
#     db: Session = Depends(get_db),
#     # current_user = Depends(get_current_user)
# ):
#     """
#     Simulate a governed AI action through the full architecture:
#     Memory Layer -> Decision Layer (MCP) -> Execution Layer
#     """
#     try:
#         result = OrchestrationService.process_intent(
#             db=db,
#             workspace_id=uuid.UUID(request.workspace_id),
#             action_type=request.action_type,
#             intent_raw=request.intent,
#             metadata=request.metadata
#         )
#         return result
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))
