from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.integration_service import IntegrationService
from app.core.security import verify_workspace_access
from app.routers.auth import get_current_user

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/google/auth/{integration_type}")
async def google_oauth_init(
    integration_type: str,
    workspace_id: str | None = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    workspace_id = verify_workspace_access(current_user, db, workspace_id)
    try:
        url = IntegrationService.get_google_oauth_url(db, workspace_id, integration_type)
        return {"authorization_url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/google/callback")
async def google_oauth_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from fastapi.responses import RedirectResponse
    from app.core.config import settings
    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"

    integration_type = "google"
    try:
        if state and ":" in state:
            integration_type, _ = state.split(":", 1)
    except Exception:
        pass

    try:
        verify_workspace_access(current_user, db) # No workspace_id available here, so default behavior is fine.
        integration_type = IntegrationService.handle_google_oauth_callback(db, code, state)
        return RedirectResponse(
            url=f"{frontend_url}/user/admin/channels?status=success&integration={integration_type}"
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Google integration callback failed: {str(e)}")
        return RedirectResponse(
            url=f"{frontend_url}/user/admin/channels?status=error&integration={integration_type}"
        )

@router.get("/status")
async def get_integration_status(
    workspace_id: str | None = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    workspace_id = verify_workspace_access(current_user, db, workspace_id)
    return IntegrationService.get_integration_status(db, workspace_id)

@router.delete("/disconnect/{integration_type}")
async def disconnect_integration(
    integration_type: str,
    workspace_id: str | None = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    workspace_id = verify_workspace_access(current_user, db, workspace_id)
    IntegrationService.disconnect_integration(db, workspace_id, integration_type)
    
    return {"status": "success", "message": f"Disconnected {integration_type}"}
