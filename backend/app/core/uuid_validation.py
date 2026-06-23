
import re
import logging
from fastapi import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# Strict RFC-4122 UUID pattern
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# Heuristic: any query-param whose name contains "id" (case-insensitive)
_ID_PARAM_RE = re.compile(r"id", re.IGNORECASE)


def _looks_like_uuid(value: str) -> bool:
    # UUID must have exactly 4 dashes
    if value.count("-") != 4:
        return False

    # Rough UUID length check
    if len(value) != 36:
        return False

    return True


class UUIDValidationMiddleware:
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

        #  Check query params containing "id" 
        for param_name, param_value in request.query_params.items():
            if not _ID_PARAM_RE.search(param_name):
                continue
            if not param_value:
                continue
            if _looks_like_uuid(param_value) and not _UUID_RE.match(param_value):
                logger.warning(
                    "Malformed UUID in query param '%s': %s", param_name, param_value
                )
                response = JSONResponse(
                    status_code=422,
                    content={
                        "detail": f"Invalid UUID format for parameter '{param_name}': {param_value}"
                    },
                )
                await response(scope, receive, send)
                return

        #  Check path segments that look like UUIDs
        for segment in request.url.path.strip("/").split("/"):
            if _looks_like_uuid(segment) and not _UUID_RE.match(segment):
                logger.warning("Malformed UUID in path segment: %s", segment)
                response = JSONResponse(
                    status_code=422,
                    content={
                        "detail": f"Invalid UUID format in path: {segment}"
                    },
                )
                await response(scope, receive, send)
                return

        try:
            await self.app(scope, receive, send)
        except ValueError as exc:
            # Catch any remaining UUID parse errors that slip past FastAPI's
            if "UUID" in str(exc) or "badly formed" in str(exc):
                logger.warning("UUID ValueError caught by middleware: %s", exc)
                response = JSONResponse(
                    status_code=422,
                    content={"detail": f"Invalid UUID: {exc}"},
                )
                await response(scope, receive, send)
                return
            raise

