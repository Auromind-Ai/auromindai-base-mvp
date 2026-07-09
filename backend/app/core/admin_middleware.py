import logging
import re
import posixpath
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi import Request, status
from jose import jwt, JWTError
from app.core.config import settings
import secrets

logger = logging.getLogger(__name__)

class AdminConsoleMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        if request.method == "OPTIONS":
            await self.app(scope, receive, send)
            return
            
        # Normalize and collapse duplicate slashes in path (e.g. //admin -> /admin)
        raw_path = request.url.path
        normalized_path = posixpath.normpath(re.sub(r"/+", "/", raw_path))
        scope["path"] = normalized_path
        
        admin_prefix = "/admin"

        # Check if normalized path matches admin console prefix
        if normalized_path == admin_prefix or normalized_path.startswith(f"{admin_prefix}/"):
            # Public entry point for Admin Secret submission
            if normalized_path == f"{admin_prefix}/auth":
                await self.app(scope, receive, send)
                return
            
            token = request.cookies.get("admin_session") or request.headers.get("x-admin-session")
            is_authorized = False
            role = None
            purpose = None
            payload = None
            
            if token:
                try:
                    payload = jwt.decode(
                        token,
                        settings.SECRET_KEY,
                        algorithms=[settings.ALGORITHM]
                    )
                    role = payload.get("role") or payload.get("platform_role")
                    purpose = payload.get("purpose")
                    
                    if role == "platform_admin" and purpose == "admin_console":
                        is_authorized = True
                        # Verify CSRF for unsafe methods targeting /admin paths
                        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
                            expected_csrf = payload.get("csrf_token")
                            header_csrf = request.headers.get("x-admin-csrf-token")
                            if not expected_csrf or not secrets.compare_digest(str(expected_csrf), str(header_csrf or "")):
                                logger.warning(
                                    f"CSRF validation failed for {normalized_path} from IP {request.client.host if request.client else 'unknown'}"
                                )
                                is_authorized = False
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
                    f"Unauthorized access attempt to {normalized_path} from IP {request.client.host if request.client else 'unknown'}. "
                    f"Reject reason: {reject_reason}"
                )
                response = JSONResponse(
                    status_code=status.HTTP_404_NOT_FOUND,
                    content={"detail": "Not Found"}
                )
                await response(scope, receive, send)
                return
        
        await self.app(scope, receive, send)
