import time
from fastapi import APIRouter, Request, Response, HTTPException, status
from app.schemas.admin import AdminAuthRequest
from app.core.config import settings
from . import (
    ai_actions,
    dashboard,
    workspaces,
    users,
    tokens,
    conversations,
    logs,
    analytics,
    billing,
    ai_governance,
    integrations,
    rag,
    system,
    ai_learning,
    settings as admin_settings,
    impersonate,
    rag_analytics,
    model_configs,
    entitlements,
    feature_rules
)

router = APIRouter(prefix="/admin", tags=["Admin"])

# Rate limit tracking structure
_ADMIN_AUTH_ATTEMPTS: dict[str, list[float]] = {}
ADMIN_AUTH_WINDOW = 15 * 60  # 15 minutes
ADMIN_AUTH_MAX_ATTEMPTS = 3



@router.post("/auth", include_in_schema=False)
async def admin_auth(
    request: Request,
    body: AdminAuthRequest,
    response: Response,
):
    # Retrieve client IP, taking proxy headers into account
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.headers.get("x-real-ip", request.client.host if request.client else "unknown").strip()
    
    # Check rate limiting
    now = time.time()
    attempts = _ADMIN_AUTH_ATTEMPTS.setdefault(ip, [])
    attempts[:] = [t for t in attempts if now - t < ADMIN_AUTH_WINDOW]
    
    if len(attempts) >= ADMIN_AUTH_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Try again later."
        )
    
    # Check secret key
    import secrets
    if not secrets.compare_digest(body.password, settings.OWNER_SECRET_KEY):
        attempts.append(now)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden"
        )
        
    # Generate admin JWT
    from datetime import timedelta
    from app.utils.auth import create_access_token
    token = create_access_token(
        data={"role": "platform_admin", "sub": "platform_admin"},
        expires_delta=timedelta(hours=2)
    )
    
    is_https = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    cookie_samesite = "none" if is_https else "lax"
    
    # Set secure httpOnly cookie
    response.set_cookie(
        key="admin_session",
        value=token,
        httponly=True,
        secure=is_https,
        samesite=cookie_samesite,
        max_age=7200,
        path="/api/admin",
    )
    
    return {"status": "success", "message": "Authenticated"}

@router.post("/logout", include_in_schema=False)
async def admin_logout(request: Request, response: Response):
    is_https = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    cookie_samesite = "none" if is_https else "lax"
    response.delete_cookie(
        key="admin_session",
        path="/api/admin",
        secure=is_https,
        samesite=cookie_samesite,
    )
    return {"status": "success", "message": "Logged out"}

# include in order matching sidebar
router.include_router(dashboard.router)
router.include_router(workspaces.router)
router.include_router(users.router)
router.include_router(tokens.router)
router.include_router(conversations.router)
router.include_router(logs.router)
router.include_router(analytics.router)
router.include_router(billing.router)
router.include_router(ai_actions.router)
router.include_router(ai_governance.router)
router.include_router(integrations.router)
router.include_router(rag.router)
router.include_router(system.router)
router.include_router(ai_learning.router)
router.include_router(admin_settings.router)
router.include_router(impersonate.router)
router.include_router(rag_analytics.router)
router.include_router(model_configs.router)
router.include_router(entitlements.router)
router.include_router(feature_rules.router)