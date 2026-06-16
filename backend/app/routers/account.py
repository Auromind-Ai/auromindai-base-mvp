"""Account management endpoints — deletion request and cancellation."""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.auth import get_current_user, CurrentUser
from app.services.account_service import AccountService

router = APIRouter()


@router.post("/request-deletion")
async def request_deletion(
    response: Response,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Schedule the authenticated user's account for deletion (30-day grace period)."""
    try:
        result = AccountService.request_deletion(db, current_user.id)

        # Clear auth cookie immediately — user is logged out
        from app.core.config import settings
        is_prod = settings.ENVIRONMENT.lower() == "production"
        response.delete_cookie(
            key="auth_token",
            path="/",
            samesite="strict" if is_prod else "lax",
        )

        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/cancel-deletion")
async def cancel_deletion(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a pending deletion and fully restore the account."""
    try:
        return AccountService.cancel_deletion(db, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))