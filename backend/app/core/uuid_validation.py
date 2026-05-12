
import re
import logging
from starlette.middleware.base import BaseHTTPMiddleware
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


class UUIDValidationMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request, call_next):
        # ── Check query params containing "id" ────
        for param_name, param_value in request.query_params.items():
            if not _ID_PARAM_RE.search(param_name):
                continue
            if not param_value:
                continue
            if _looks_like_uuid(param_value) and not _UUID_RE.match(param_value):
                logger.warning(
                    "Malformed UUID in query param '%s': %s", param_name, param_value
                )
                return JSONResponse(
                    status_code=422,
                    content={
                        "detail": f"Invalid UUID format for parameter '{param_name}': {param_value}"
                    },
                )

        # ── Check path segments that look like UUIDs────
        for segment in request.url.path.strip("/").split("/"):
            if _looks_like_uuid(segment) and not _UUID_RE.match(segment):
                logger.warning("Malformed UUID in path segment: %s", segment)
                return JSONResponse(
                    status_code=422,
                    content={
                        "detail": f"Invalid UUID format in path: {segment}"
                    },
                )

        try:
            return await call_next(request)
        except ValueError as exc:
            # Catch any remaining UUID parse errors that slip past FastAPI's
            # path converters (e.g. custom parsing code in handlers).
            if "UUID" in str(exc) or "badly formed" in str(exc):
                logger.warning("UUID ValueError caught by middleware: %s", exc)
                return JSONResponse(
                    status_code=422,
                    content={"detail": f"Invalid UUID: {exc}"},
                )
            raise
