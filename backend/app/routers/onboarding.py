import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.core.security import verify_workspace_access
from app.services.onboarding_service import OnboardingService
from app.schemas.onboarding import (
    DismissOnboardingRequest,
    Check2FARequest,
    CheckBusinessVerificationRequest
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["onboarding"])


@router.get("/workspace/onboarding")
@router.get("/onboarding/status")
async def get_onboarding_status(
    workspace_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    verified_ws = verify_workspace_access(
        current_user,
        db,
        workspace_id,
        required_permission=("channels.manage", "inbox.conversations", "marketing.campaigns", "automation.manage")
    )
    return OnboardingService.get_onboarding_status(db, verified_ws)


@router.post("/workspace/onboarding/dismiss")
@router.post("/onboarding/dismiss")
async def dismiss_onboarding(
    payload: DismissOnboardingRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    verified_ws = verify_workspace_access(
        current_user,
        db,
        payload.workspace_id,
        required_permission="channels.manage"
    )
    return OnboardingService.set_onboarding_dismissed(db, verified_ws, dismissed=payload.dismissed)


@router.post("/workspace/onboarding/check-2fa")
@router.post("/onboarding/check-2fa")
async def check_2fa_status(
    payload: Check2FARequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    verified_ws = verify_workspace_access(
        current_user,
        db,
        payload.workspace_id,
        required_permission="channels.manage"
    )
    return OnboardingService.check_2fa_status(
        db,
        verified_ws,
        manual_confirm=payload.manual_confirm
    )


@router.post("/workspace/onboarding/check-business-verification")
@router.post("/onboarding/check-business-verification")
async def check_business_verification(
    payload: CheckBusinessVerificationRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    verified_ws = verify_workspace_access(
        current_user,
        db,
        payload.workspace_id,
        required_permission="channels.manage"
    )
    return OnboardingService.check_business_verification(
        db,
        verified_ws,
        manual_status=payload.manual_status
    )
