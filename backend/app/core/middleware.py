import time
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.metrics import get_api_calls, record_request
from app.core.metrics import increment_api_calls



class MetricsMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request, call_next):

        start_time = time.time()

        response = await call_next(request)

        process_time = time.time() - start_time

        is_error = response.status_code >= 400

        record_request(process_time, is_error)

        return response
    


class APICountMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request, call_next):

        # Skip websocket
        if request.url.path.startswith("/ws"):
            return await call_next(request)

        increment_api_calls()
        print(f"API Call Count: {get_api_calls()}")
        response = await call_next(request)

        return response
    