import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
import urllib.parse
from types import SimpleNamespace
from app.core.integration_state import sign_integration_state, read_integration_state
from app.database import get_db
from app.services.integration_service import IntegrationService
from app.core.security import verify_workspace_access
from app.routers.auth import get_current_user, _get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["integrations"])


ALLOWED_GOOGLE_INTEGRATIONS = {"google_calendar", "google_gmail", "calendar", "gmail"}

@router.get("/google/auth/{integration_type}")
async def google_oauth_init(
    request: Request,
    integration_type: str,
    workspace_id: str | None = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if integration_type.lower() not in ALLOWED_GOOGLE_INTEGRATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid integration type '{integration_type}'. Allowed types: {', '.join(sorted(ALLOWED_GOOGLE_INTEGRATIONS))}"
        )

    workspace_id = verify_workspace_access(current_user, db, workspace_id, required_permission='channels.manage')

    # Capture dynamic frontend URL from referer / origin
    referer = request.headers.get("referer")
    origin = request.headers.get("origin")
    frontend_url = None
    if referer:
        try:
            parsed = urllib.parse.urlparse(referer)
            if parsed.scheme and parsed.netloc:
                frontend_url = f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            pass
    elif origin:
        frontend_url = origin

    if frontend_url and workspace_id:
        r_client = _get_redis_client()
        if r_client:
            try:
                r_client.setex(f"oauth_integration_frontend:{workspace_id}", 600, frontend_url)
            except Exception:
                pass

    try:
        url = IntegrationService.get_google_oauth_url(db, workspace_id, integration_type)
        parsed_url = urllib.parse.urlsplit(url)
        query = urllib.parse.parse_qs(parsed_url.query)
        query["state"] = [sign_integration_state(current_user.id, workspace_id, integration_type)]
        url = urllib.parse.urlunsplit(parsed_url._replace(query=urllib.parse.urlencode(query, doseq=True)))
        return {"authorization_url": url}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Google oauth error: {e}")
        raise HTTPException(status_code=500, detail="Google authentication failed. Please try again.")

@router.get("/google/callback")
async def google_oauth_callback(
    request: Request,
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    from fastapi.responses import RedirectResponse
    from app.core.config import settings
    from app.services.config_service import config_service

    state_data = read_integration_state(state)
    workspace_id = verify_workspace_access(
        SimpleNamespace(id=state_data["user_id"]), db, state_data["workspace_id"],
        required_permission="channels.manage",
    )
    integration_type = state_data["integration_type"]
    state = f"{integration_type}:{workspace_id}"

    # Retrieve dynamically captured frontend URL for this workspace
    frontend_url = None
    if workspace_id:
        r_client = _get_redis_client()
        if r_client:
            try:
                frontend_url = r_client.get(f"oauth_integration_frontend:{workspace_id}")
            except Exception:
                pass

    if not frontend_url:
        frontend_url = config_service.get("frontend_url") or settings.FRONTEND_URL or "http://localhost:3000"

    try:
        integration_type = IntegrationService.handle_google_oauth_callback(db, code, state)
        return RedirectResponse(
            url=f"{frontend_url}/channels?status=success&integration={integration_type}"
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Google integration callback failed: {str(e)}")
        return RedirectResponse(
            url=f"{frontend_url}/channels?status=error&integration={integration_type}"
        )

@router.get("/status")
async def get_integration_status(
    workspace_id: str | None = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workspace_id = verify_workspace_access(current_user, db, workspace_id, required_permission=('channels.manage', 'inbox.conversations', 'marketing.campaigns', 'automation.manage'))
    return IntegrationService.get_integration_status(db, workspace_id)

@router.get("/gmail/accounts")
async def list_gmail_accounts(
    workspace_id: str | None = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workspace_id = verify_workspace_access(current_user, db, workspace_id, required_permission='channels.manage')
    return IntegrationService.get_gmail_accounts(db, workspace_id)

@router.delete("/gmail/accounts/{account_id}")
async def delete_gmail_account(
    account_id: str,
    workspace_id: str | None = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workspace_id = verify_workspace_access(current_user, db, workspace_id, required_permission='channels.manage')
    success = IntegrationService.disconnect_gmail_account(db, workspace_id, account_id=account_id)
    if not success:
        raise HTTPException(status_code=404, detail="Gmail account not found")
    return {"status": "success", "message": "Gmail account disconnected successfully"}

@router.delete("/disconnect/{integration_type}")
async def disconnect_integration(
    integration_type: str,
    workspace_id: str | None = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workspace_id = verify_workspace_access(current_user, db, workspace_id, required_permission='channels.manage')
    IntegrationService.disconnect_integration(db, workspace_id, integration_type)
    return {"status": "success", "message": f"Disconnected {integration_type}"}

