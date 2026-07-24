from fastapi import Request, Response, status
import secrets
from jose import JWTError, jwt
from app.core.config import settings

async def csrf_protection_middleware(request: Request, call_next):
    # Enforce CSRF validation for mutating methods
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        path = request.url.path
        
        # Group public auth & webhook prefixes for clean maintainability
        PUBLIC_AUTH_PREFIXES = (
            "/auth/login", "/api/auth/login",
            "/auth/logout", "/api/auth/logout",
            "/auth/send-otp", "/api/auth/send-otp",
            "/auth/verify-otp", "/api/auth/verify-otp",
            "/auth/signup", "/api/auth/signup",
            "/auth/google", "/api/auth/google",
        )
        PUBLIC_WEBHOOK_PREFIXES = (
            "/twilio/", "/api/twilio/",
            "/whatsapp/", "/api/whatsapp/",
            "/instagram/", "/api/instagram/",
            "/meta/webhook", "/api/meta/webhook",
            "/billing/webhook", "/api/billing/webhook",
        )
        PUBLIC_EXACT_PATHS = ("/", "/health")

        is_public = (
            path.startswith(PUBLIC_AUTH_PREFIXES)
            or path.startswith(PUBLIC_WEBHOOK_PREFIXES)
            or path in PUBLIC_EXACT_PATHS
            or path.startswith("/admin/") # admin sub-routes use AdminConsoleMiddleware for CSRF validation
        )
        
        if not is_public:
            header_token = request.headers.get("x-csrf-token")
            token = request.cookies.get("auth_token")
            expected_token = None
            
            if token:
                try:
                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                    expected_token = payload.get("csrf_token")
                except JWTError:
                    pass
            
            import logging
            log = logging.getLogger("app")
            
            if not expected_token or not header_token or not secrets.compare_digest(expected_token, header_token):
                if not expected_token:
                    log.warning(f"🛡️ CSRF Blocked: Expected token not found in JWT cookie payload. Path: {path}")
                elif not header_token:
                    log.warning(f"🛡️ CSRF Blocked: Missing X-CSRF-Token in request headers. Path: {path}")
                else:
                    log.warning(f"🛡️ CSRF Blocked: Token mismatch. JWT: {expected_token[:6]}... vs Header: {header_token[:6]}... Path: {path}")
                return Response(
                    content="CSRF validation failed", 
                    status_code=status.HTTP_403_FORBIDDEN
                )

    return await call_next(request)
