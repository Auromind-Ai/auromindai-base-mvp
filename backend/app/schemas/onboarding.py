from typing import Optional, Dict, Any
from pydantic import BaseModel


class DismissOnboardingRequest(BaseModel):
    workspace_id: Optional[str] = None
    dismissed: bool = True


class Check2FARequest(BaseModel):
    workspace_id: Optional[str] = None
    manual_confirm: bool = False


class CheckBusinessVerificationRequest(BaseModel):
    workspace_id: Optional[str] = None
    manual_status: Optional[str] = None  # 'not_verified', 'pending', 'verified', 'failed'
