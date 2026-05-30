import time
from fastapi import Request
from app.core.metrics import middleware_record

class MetricsMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        start_time = time.time()
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
            process_time = time.time() - start_time
            middleware_record(
                request.method,
                request.url.path,
                status_code[0],
                process_time
            )