import logging
from starlette.responses import JSONResponse
from fastapi import Request, status
from jose import jwt, JWTError
from app.core.config import settings
import secrets

logger = logging.getLogger(__name__)

# Allowed origins for CORS headers in blocked admin responses
_ADMIN_CORS_ORIGINS = [
    "https://orbionagents.com",
    "http://orbionagents.com",
    "https://www.orbionagents.com",
    "http://www.orbionagents.com",
    "https://staging.orbionagents.com",
    "https://growwdigitel.cloud",
    "http://growwdigitel.cloud",
    "https://www.growwdigitel.cloud",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def _blocked_response(scope, request: Request, status_code: int, detail: str) -> JSONResponse:
    """
    Returns a JSONResponse that includes CORS headers for the requesting origin.
    This is required because AdminConsoleMiddleware is the outermost middleware
    and short-circuits before CORSMiddleware can add headers.
    """
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in _ADMIN_CORS_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Vary"] = "Origin"

    return JSONResponse(
        status_code=status_code,
        content={"detail": detail},
        headers=headers,
    )


class AdminConsoleMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)

        # Always pass OPTIONS through — CORSMiddleware handles preflight
        if request.method == "OPTIONS":
            await self.app(scope, receive, send)
            return

        path = request.url.path
        admin_prefix = "/admin"

        # Normalise path: strip trailing slash for admin routes to prevent 307 loops
        if path.startswith("/admin/") and path != "/admin/":
            # Only strip if there is a trailing slash and it's not the only char
            stripped = path.rstrip("/")
            if stripped != path:
                scope["path"] = stripped
                path = stripped

        # Guard admin routes
        if path.startswith(admin_prefix):
            # Auth endpoint is always public
            if path in (f"{admin_prefix}/auth", f"{admin_prefix}/auth/"):
                await self.app(scope, receive, send)
                return

            token = request.cookies.get("admin_session")
            is_authorized = False

            if token:
                try:
                    payload = jwt.decode(
                        token,
                        settings.SECRET_KEY,
                        algorithms=[settings.ALGORITHM],
                    )
                    role = payload.get("role") or payload.get("platform_role")
                    purpose = payload.get("purpose")
                    
                    if role == "platform_admin" and purpose == "admin_console":
                        is_authorized = True
                        # CSRF check for mutating methods
                        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
                            expected_csrf = payload.get("csrf_token")
                            header_csrf = request.headers.get("x-admin-csrf-token")
                            if not expected_csrf or not secrets.compare_digest(str(expected_csrf), str(header_csrf or "")):
                                logger.warning(
                                    "Admin CSRF validation failed for %s from %s",
                                    path,
                                    request.client.host if request.client else "unknown",
                                )
                                resp = _blocked_response(
                                    scope, request,
                                    status.HTTP_403_FORBIDDEN,
                                    "CSRF validation failed",
                                )
                                await resp(scope, receive, send)
                                return
                except JWTError:
                    pass

            if not is_authorized:
                reject_reason = "Unknown"
                if not token:
                    reject_reason = "Missing admin_session token/cookie"
                elif not payload:
                    reject_reason = "Invalid/Expired admin_session token"
                elif role != "platform_admin" or purpose != "admin_console":
                    reject_reason = f"Unauthorized role/purpose"
                else:
                    reject_reason = "CSRF verification failed"

                logger.warning(
                    "Unauthorised admin request: %s %s from %s",
                    request.method,
                    path,
                    request.client.host if request.client else "unknown",
                )
                resp = _blocked_response(
                    scope, request,
                    status.HTTP_404_NOT_FOUND,
                    "Not Found",
                )
                await resp(scope, receive, send)
                return

        await self.app(scope, receive, send)
