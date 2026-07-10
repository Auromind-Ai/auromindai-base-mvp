# Reset admin rate limit trigger
import time
from fastapi import APIRouter, Request, Response, HTTPException, status, Depends
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
    templates,
    entitlements,
    feature_rules,
    flow_packs
)

router = APIRouter(prefix="/admin", tags=["Admin"])

# Rate limit tracking structure
_ADMIN_AUTH_ATTEMPTS: dict[str, list[float]] = {}
ADMIN_AUTH_WINDOW = 15 * 60  # 15 minutes
ADMIN_AUTH_MAX_ATTEMPTS = 3



from app.routers.auth import CurrentUser, get_current_user
from app.core.deps import require_platform_admin_session
from app.core.enums import PlatformRole

@router.post("/auth", include_in_schema=False)
async def admin_auth(
    request: Request,
    body: AdminAuthRequest,
    response: Response,
    current_user: CurrentUser = Depends(get_current_user)
):
    # Verify user platform_role
    role_val = current_user.user.platform_role.value if hasattr(current_user.user.platform_role, "value") else str(current_user.user.platform_role)
    if role_val != PlatformRole.PLATFORM_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform administrative privileges required."
        )

    # Retrieve client IP, taking proxy headers into account
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.headers.get("x-real-ip", request.client.host if request.client else "unknown").strip()
    
    # Check rate limiting (IP-based)
    now = time.time()
    attempts = _ADMIN_AUTH_ATTEMPTS.setdefault(ip, [])
    attempts[:] = [t for t in attempts if now - t < ADMIN_AUTH_WINDOW]
    
    if len(attempts) >= ADMIN_AUTH_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Try again later."
        )

    # Per-user Admin Secret lockout via Redis (5 attempts -> 15 min lock)
    user_id_str = str(current_user.id)
    lockout_key = f"admin_secret_attempts:{user_id_str}"
    r_client = None
    try:
        import redis
        r_client = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.0, socket_timeout=1.0)
        failed_count = int(r_client.get(lockout_key) or 0)
        if failed_count >= 5:
            ttl = r_client.ttl(lockout_key)
            mins_left = max(1, int(ttl / 60)) if ttl > 0 else 15
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed admin secret attempts. Locked out for {mins_left} minutes."
            )
    except HTTPException:
        raise
    except Exception:
        r_client = None

    # Check secret key
    import secrets
    if not settings.OWNER_SECRET_KEY or not secrets.compare_digest(body.password, settings.OWNER_SECRET_KEY):
        attempts.append(now)
        if r_client:
            try:
                pipe = r_client.pipeline()
                pipe.incr(lockout_key)
                pipe.expire(lockout_key, 900)  # 15 minutes TTL
                pipe.execute()
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden"
        )
    
    # Reset lockout counter on success
    if r_client:
        try:
            r_client.delete(lockout_key)
        except Exception:
            pass
        
    # Generate short-lived admin_session JWT (30-min duration)
    from datetime import timedelta
    from app.utils.auth import create_access_token
    import secrets
    csrf_token = secrets.token_urlsafe(32)
    token = create_access_token(
        data={
            "sub": str(current_user.id),
            "platform_role": PlatformRole.PLATFORM_ADMIN.value,
            "role": PlatformRole.PLATFORM_ADMIN.value,
            "purpose": "admin_console",
            "csrf_token": csrf_token
        },
        expires_delta=timedelta(minutes=30)
    )
    
    is_https = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    cookie_samesite = "none" if is_https else "lax"
    
    # Extract domain for cookie sharing between frontend and backend on subdomains
    cookie_domain = None
    request_host = request.url.hostname
    if settings.FRONTEND_URL and request_host:
        from urllib.parse import urlparse
        parsed = urlparse(settings.FRONTEND_URL)
        if parsed.hostname and (request_host == parsed.hostname or request_host.endswith("." + parsed.hostname)):
            parts = parsed.hostname.split(".")
            # Ignore IP addresses and localhost
            if len(parts) >= 2 and not parsed.hostname.replace(".", "").isdigit() and "localhost" not in parsed.hostname:
                cookie_domain = "." + ".".join(parts[-2:])
                
    # Set secure httpOnly cookie (30 minutes max age)
    response.set_cookie(
        key="admin_session",
        value=token,
        httponly=True,
        secure=is_https,
        samesite=cookie_samesite,
        max_age=1800,
        path="/",
        domain=cookie_domain,
    )
    
    return {"status": "success", "message": "Authenticated", "csrf_token": csrf_token}

@router.post("/logout", include_in_schema=False)
async def admin_logout(request: Request, response: Response):
    is_https = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    cookie_samesite = "none" if is_https else "lax"
    
    # Extract domain for cookie sharing between frontend and backend on subdomains
    cookie_domain = None
    request_host = request.url.hostname
    if settings.FRONTEND_URL and request_host:
        from urllib.parse import urlparse
        parsed = urlparse(settings.FRONTEND_URL)
        if parsed.hostname and (request_host == parsed.hostname or request_host.endswith("." + parsed.hostname)):
            parts = parsed.hostname.split(".")
            if len(parts) >= 2 and not parsed.hostname.replace(".", "").isdigit() and "localhost" not in parsed.hostname:
                cookie_domain = "." + ".".join(parts[-2:])
                
    for key_name in ["admin_session", "auth_token", "admin_backup_token"]:
        response.delete_cookie(
            key=key_name,
            path="/",
            secure=is_https,
            samesite=cookie_samesite,
            domain=cookie_domain,
        )
    return {"status": "success", "message": "Logged out"}

# Include sub-routers protected by require_platform_admin_session
admin_deps = [Depends(require_platform_admin_session)]
router.include_router(dashboard.router, dependencies=admin_deps)
router.include_router(workspaces.router, dependencies=admin_deps)
router.include_router(users.router, dependencies=admin_deps)
router.include_router(tokens.router, dependencies=admin_deps)
router.include_router(conversations.router, dependencies=admin_deps)
router.include_router(logs.router, dependencies=admin_deps)
router.include_router(analytics.router, dependencies=admin_deps)
router.include_router(billing.router, dependencies=admin_deps)
router.include_router(ai_actions.router, dependencies=admin_deps)
router.include_router(ai_governance.router, dependencies=admin_deps)
router.include_router(integrations.router, dependencies=admin_deps)
router.include_router(rag.router, dependencies=admin_deps)
router.include_router(system.router, dependencies=admin_deps)
router.include_router(ai_learning.router, dependencies=admin_deps)
router.include_router(admin_settings.router, dependencies=admin_deps)
router.include_router(impersonate.router, dependencies=admin_deps)
router.include_router(rag_analytics.router, dependencies=admin_deps)
router.include_router(model_configs.router, dependencies=admin_deps)
router.include_router(templates.router, dependencies=admin_deps)
router.include_router(entitlements.router, dependencies=admin_deps)
router.include_router(feature_rules.router, dependencies=admin_deps)
router.include_router(flow_packs.router, dependencies=admin_deps)
