import time
from fastapi import Request
from app.core.logger import logger

class RequestLoggingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        start = time.time()
        status_code = [500]

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code[0] = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            status_code[0] = 500
            raise e
        finally:
            process_time = time.time() - start
            # Only log errors (HTTP 4xx and 5xx); suppress all routine 2xx/3xx polling requests
            if status_code[0] >= 400 and request.method != "OPTIONS":
                logger.error(
                    f"{request.method} {request.url.path} | "
                    f"Status {status_code[0]} | "
                    f"{process_time:.3f}s"
                )