from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logger import logger
import time

class RequestLoggingMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request, call_next):

        start = time.time()
        response = await call_next(request)
        process_time = time.time() - start

        if request.method != "OPTIONS":
            logger.info(
                f"{request.method} {request.url.path} | "
                f"Status {response.status_code} | "
                f"{process_time:.3f}s"
            )

        return response