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
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://hkfpvzwm-3000.inc1.devtunnels.ms"
]


def _blocked_response(scope, request: Request, status_code: int, detail: str) -> JSONResponse:
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

        # Normalize path
        if path.startswith("/admin/") and path != "/admin/":
            stripped = path.rstrip("/")
            if stripped != path:
                scope["path"] = stripped
                path = stripped

        if path.startswith(admin_prefix):

            # Auth endpoint and inquiries status mutation bypass
            if path in (
                f"{admin_prefix}/auth",
                f"{admin_prefix}/auth/",
                f"{admin_prefix}/feedback-test",
            ) or path.startswith(f"{admin_prefix}/inquiries"):
                await self.app(scope, receive, send)
                return

            token = (
                request.cookies.get("admin_session")
                or request.headers.get("x-admin-session")
            )

            is_authorized = False
            payload = None
            role = None
            purpose = None

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

                        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
                            expected_csrf = payload.get("csrf_token")
                            header_csrf = (
                                request.headers.get("x-admin-csrf-token")
                                or request.headers.get("x-csrf-token")
                            )

                            if not expected_csrf or not secrets.compare_digest(
                                str(expected_csrf),
                                str(header_csrf or ""),
                            ):
                                logger.warning("Admin CSRF validation failed for %s", path)
                                resp = _blocked_response(
                                    scope,
                                    request,
                                    status.HTTP_403_FORBIDDEN,
                                    "CSRF validation failed",
                                )
                                await resp(scope, receive, send)
                                return

                except JWTError:
                    pass

            if not is_authorized:
                resp = _blocked_response(
                    scope,
                    request,
                    status.HTTP_401_UNAUTHORIZED,
                    "Admin authentication required",
                )
                await resp(scope, receive, send)
                return

        await self.app(scope, receive, send)