import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi import Request, status
from jose import jwt, JWTError
from app.core.config import settings

logger = logging.getLogger(__name__)

class AdminConsoleMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        admin_prefix = f"/{settings.ADMIN_CONSOLE_PATH}"
        
        # Check if the request starts with the designated admin console path prefix
        if path.startswith(admin_prefix):
            if path == f"{admin_prefix}/auth":
                return await call_next(request)
            
            token = request.cookies.get("admin_session")
            is_authorized = False
            
            if token:
                try:
                    payload = jwt.decode(
                        token,
                        settings.SECRET_KEY,
                        algorithms=[settings.ALGORITHM]
                    )
                    if payload.get("role") == "platform_admin":
                        is_authorized = True
                except JWTError:
                    pass
            
            if not is_authorized:
                logger.warning(
                    f"Unauthorized access attempt to {path} from IP {request.client.host if request.client else 'unknown'}"
                )
                return JSONResponse(
                    status_code=status.HTTP_404_NOT_FOUND,
                    content={"detail": "Not Found"}
                )
        
        return await call_next(request)
