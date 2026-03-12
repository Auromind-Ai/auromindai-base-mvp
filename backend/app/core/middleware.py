import time
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.metrics import middleware_record


class MetricsMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request, call_next):

        if request.url.path.startswith("/ws"):
            return await call_next(request)

        start_time = time.time()

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            status_code = 500
            raise e
        finally:

            process_time = time.time() - start_time

            middleware_record(
                request.method,
                request.url.path,
                status_code,
                process_time
            )

        return response