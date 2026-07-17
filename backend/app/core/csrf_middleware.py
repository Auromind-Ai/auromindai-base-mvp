from fastapi import Request, Response, status
import secrets
from jose import JWTError, jwt
from app.core.config import settings

async def csrf_protection_middleware(request: Request, call_next):
    # Enforce CSRF validation for mutating methods
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        path = request.url.path
        
        # Bypass public login, OTP registration, and external provider callbacks/webhooks
        is_public = (
            path.startswith("/auth/login")
            or path.startswith("/api/auth/login")
            or path.startswith("/auth/logout")
            or path.startswith("/api/auth/logout")
            or path.startswith("/auth/send-otp")
            or path.startswith("/api/auth/send-otp")
            or path.startswith("/auth/verify-otp")
            or path.startswith("/api/auth/verify-otp")
            or path.startswith("/auth/google")
            or path.startswith("/api/auth/google")
            or path.startswith("/twilio/webhook")
            or path.startswith("/api/twilio/webhook")
            or path.startswith("/meta/webhook")
            or path.startswith("/api/meta/webhook")
            or path == "/"
            or path == "/health"
            or path.startswith("/admin/") # admin sub-routes already use AdminConsoleMiddleware for CSRF validation
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
