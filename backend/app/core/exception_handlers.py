import logging
from typing import Any, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from app.core.exceptions import (
    AuromindException,
    BillingError,
    BillingConfigurationError,
    GuardrailError,
    ChatProcessingError,
    RAGError,
    WorkspaceAccessError,
    AIProviderError,
)
from app.core.sanitizer import (
    sanitize_user_message,
    sanitize_validation_errors,
    contains_technical_leak,
)

from app.core.logger import logger

HTTP_413_PAYLOAD_TOO_LARGE = getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413)
HTTP_422_UNPROCESSABLE = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422)

STATUS_CODE_TO_ERROR_CODE = {
    status.HTTP_400_BAD_REQUEST: "BAD_REQUEST",
    status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
    status.HTTP_402_PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
    status.HTTP_403_FORBIDDEN: "FORBIDDEN",
    status.HTTP_404_NOT_FOUND: "NOT_FOUND",
    status.HTTP_405_METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
    status.HTTP_409_CONFLICT: "CONFLICT",
    HTTP_413_PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: "UNSUPPORTED_MEDIA_TYPE",
    HTTP_422_UNPROCESSABLE: "VALIDATION_ERROR",
    status.HTTP_429_TOO_MANY_REQUESTS: "RATE_LIMIT_EXCEEDED",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
    status.HTTP_502_BAD_GATEWAY: "BAD_GATEWAY",
    status.HTTP_503_SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
    status.HTTP_504_GATEWAY_TIMEOUT: "GATEWAY_TIMEOUT",
}


def build_error_response(
    status_code: int,
    message: str,
    error_code: str | None = None,
    errors: list | dict | None = None,
    detail: any = None,
    headers: dict | None = None,
) -> JSONResponse:
    """Builds a standardized, sanitized API error response payload adhering to white-label standards."""
    code = error_code or STATUS_CODE_TO_ERROR_CODE.get(status_code, f"HTTP_{status_code}")
    clean_message = sanitize_user_message(message, status_code=status_code)
    
    # Detail can be a string, dict, or list
    if isinstance(detail, (dict, list)):
        clean_detail = detail
    else:
        clean_detail = sanitize_user_message(detail if detail is not None else message, status_code=status_code)

    content = {
        "success": False,
        "message": clean_message,
        "error_code": code,
        "errors": errors if errors is not None else [],
        "detail": clean_detail,
    }
    return JSONResponse(status_code=status_code, content=content, headers=headers)


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handles Pydantic request validation errors cleanly without exposing schema internals."""
    raw_errors = []
    for err in exc.errors():
        field = ".".join(
            str(loc) for loc in err.get("loc", [])
            if str(loc) not in ("body", "query", "path", "header")
        )
        if not field and err.get("loc"):
            field = str(err["loc"][-1])
        
        msg_val = str(err.get("msg", "Invalid value")).strip()
        # Clean Pydantic's internal "Value error, " / "Assertion failed, " prefixes
        for prefix in ("Value error, ", "Value error,", "Assertion failed, ", "Assertion failed,"):
            if msg_val.startswith(prefix):
                msg_val = msg_val[len(prefix):].strip()

        raw_errors.append({
            "field": field or "non_field_error",
            "message": msg_val,
            "type": err.get("type", "value_error"),
        })

    logger.warning(
        f"Validation error on {request.method} {request.url.path}: {raw_errors}"
    )

    formatted_errors = sanitize_validation_errors(raw_errors)
    msg = "Request validation failed. Please check the supplied fields."
    if formatted_errors:
        first_err = formatted_errors[0]
        field_name = first_err.get("field", "")
        err_message = first_err.get("message", "Invalid value")
        
        # Clean and user-friendly error message presentation
        if any(keyword in err_message.lower() for keyword in ("invalid", "expected", "required", "please", "format", "must", "cannot")):
            msg = err_message
        elif field_name and field_name != "non_field_error":
            clean_field = field_name.replace("_", " ").title()
            msg = f"{clean_field}: {err_message}"
        else:
            msg = err_message

    return build_error_response(
        status_code=HTTP_422_UNPROCESSABLE,
        message=msg,
        error_code="VALIDATION_ERROR",
        errors=formatted_errors,
        detail=msg,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handles standard FastAPI / Starlette HTTPExceptions and enforces white-label sanitization."""
    status_code = exc.status_code
    detail = exc.detail
    errors = None
    message = "An error occurred."

    if isinstance(detail, dict):
        message = detail.get("message") or detail.get("detail") or "Request failed."
        errors = detail.get("errors") or detail
    elif isinstance(detail, list):
        message = "Multiple errors occurred."
        errors = detail
    elif isinstance(detail, str):
        message = detail
    else:
        message = str(detail)

    # Developer server logging with full context
    if status_code >= 500:
        logger.error(f"HTTP {status_code} on {request.method} {request.url.path}: {message}")
    else:
        logger.warning(f"HTTP {status_code} on {request.method} {request.url.path}: {message}")

    error_code = STATUS_CODE_TO_ERROR_CODE.get(status_code, "ERROR")

    # Map specific messages to cleaner error codes if applicable
    if status_code == 429:
        error_code = "RATE_LIMIT_EXCEEDED"
    elif status_code == 413:
        error_code = "PAYLOAD_TOO_LARGE"
    elif status_code == 403 and "workspace" in str(message).lower():
        error_code = "WORKSPACE_ACCESS_DENIED"

    # Sanitize message and detail for the user response
    clean_message = sanitize_user_message(message, status_code=status_code)
    clean_detail = clean_message if isinstance(detail, str) or not isinstance(detail, (dict, list)) else detail

    headers = getattr(exc, "headers", None)
    return build_error_response(
        status_code=status_code,
        message=clean_message,
        error_code=error_code,
        errors=errors,
        detail=clean_detail,
        headers=headers,
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handles database constraint or execution failures safely without leaking schema/credentials."""
    logger.error(f"Database error on {request.method} {request.url.path}: {exc}")
    
    is_integrity = isinstance(exc, IntegrityError)
    status_code = status.HTTP_400_BAD_REQUEST if is_integrity else status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "DATA_INTEGRITY_ERROR" if is_integrity else "DATABASE_ERROR"
    
    exc_str = str(exc).lower()
    if "duplicate key" in exc_str or "unique constraint" in exc_str:
        message = "A record with this information already exists. Please check your data."
    elif is_integrity:
        message = "A database constraint violation occurred. Please verify your data."
    else:
        message = "A database error occurred while processing your request. Please try again."

    return build_error_response(
        status_code=status_code,
        message=message,
        error_code=error_code,
        detail=message,
    )


async def billing_error_handler(request: Request, exc: BillingError):
    """Handles billing/payment exceptions with full diagnostics in server logs and white-label responses."""
    logger.warning(f"Billing error on {request.method} {request.url.path}: {exc}")
    safe_msg = sanitize_user_message(str(exc), status_code=status.HTTP_402_PAYMENT_REQUIRED, default_message="Payment operation could not be completed. Please try again.")
    return build_error_response(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        message=safe_msg,
        error_code="BILLING_ERROR",
        detail=safe_msg,
    )


async def guardrail_error_handler(request: Request, exc: GuardrailError):
    """Handles guardrail violation exceptions safely."""
    logger.warning(f"Guardrail violation on {request.method} {request.url.path}: {exc}")
    safe_msg = sanitize_user_message(str(exc), status_code=status.HTTP_403_FORBIDDEN, default_message="Content policy violation.")
    return build_error_response(
        status_code=status.HTTP_403_FORBIDDEN,
        message=safe_msg,
        error_code="GUARDRAIL_VIOLATION",
        detail=safe_msg,
    )


async def chat_processing_error_handler(request: Request, exc: ChatProcessingError):
    """Handles chat processing exceptions safely."""
    logger.error(f"Chat processing error on {request.method} {request.url.path}: {exc}")
    safe_msg = sanitize_user_message(str(exc), status_code=status.HTTP_400_BAD_REQUEST, default_message="Chat processing failed. Please try again.")
    return build_error_response(
        status_code=status.HTTP_400_BAD_REQUEST,
        message=safe_msg,
        error_code="CHAT_PROCESSING_ERROR",
        detail=safe_msg,
    )


async def rag_error_handler(request: Request, exc: RAGError):
    """Handles knowledge base / RAG retrieval errors."""
    logger.error(f"RAG retrieval error on {request.method} {request.url.path}: {exc}")
    safe_msg = sanitize_user_message(str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, default_message="Failed to retrieve knowledge base information.")
    return build_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message=safe_msg,
        error_code="RAG_ERROR",
        detail=safe_msg,
    )


async def workspace_access_error_handler(request: Request, exc: WorkspaceAccessError):
    """Handles workspace access denial."""
    logger.warning(f"Workspace access denied on {request.method} {request.url.path}: {exc}")
    safe_msg = sanitize_user_message(str(exc), status_code=status.HTTP_403_FORBIDDEN, default_message="Access denied to this workspace.")
    return build_error_response(
        status_code=status.HTTP_403_FORBIDDEN,
        message=safe_msg,
        error_code="WORKSPACE_ACCESS_DENIED",
        detail=safe_msg,
    )


async def ai_provider_error_handler(request: Request, exc: AIProviderError):
    """Handles external AI provider failures safely without leaking vendor details."""
    logger.error(f"AI provider error on {request.method} {request.url.path}: {exc}")
    status_code = getattr(exc, "status_code", status.HTTP_503_SERVICE_UNAVAILABLE)
    safe_msg = sanitize_user_message(str(exc), status_code=status_code, default_message="The AI assistant service is temporarily unavailable. Please try again later.")
    return build_error_response(
        status_code=status_code,
        message=safe_msg,
        error_code="AI_PROVIDER_ERROR",
        detail=safe_msg,
    )


async def general_auromind_exception_handler(request: Request, exc: AuromindException):
    """Handles application domain base exceptions."""
    logger.error(f"Unhandled Auromind exception on {request.method} {request.url.path}: {exc}")
    safe_msg = sanitize_user_message(str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, default_message="An unexpected platform error occurred.")
    return build_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message=safe_msg,
        error_code="INTERNAL_ERROR",
        detail=safe_msg,
    )


async def value_error_handler(request: Request, exc: ValueError):
    """Handles standard Python ValueErrors safely as 400 BAD_REQUEST."""
    logger.warning(f"ValueError on {request.method} {request.url.path}: {exc}")
    safe_msg = sanitize_user_message(str(exc), status_code=status.HTTP_400_BAD_REQUEST, default_message="Invalid request parameter or value.")
    return build_error_response(
        status_code=status.HTTP_400_BAD_REQUEST,
        message=safe_msg,
        error_code="BAD_REQUEST",
        detail=safe_msg,
    )


async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all for any unhandled exceptions to prevent server crash or information leakage."""
    logger.exception(f"Unhandled Exception on {request.method} {request.url.path}: {exc}")
    return build_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="An unexpected internal server error occurred. Please try again later.",
        error_code="INTERNAL_SERVER_ERROR",
        detail="An unexpected internal server error occurred. Please try again later.",
    )


def register_exception_handlers(app: FastAPI):
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(BillingError, billing_error_handler)
    app.add_exception_handler(GuardrailError, guardrail_error_handler)
    app.add_exception_handler(ChatProcessingError, chat_processing_error_handler)
    app.add_exception_handler(RAGError, rag_error_handler)
    app.add_exception_handler(WorkspaceAccessError, workspace_access_error_handler)
    app.add_exception_handler(AIProviderError, ai_provider_error_handler)
    app.add_exception_handler(AuromindException, general_auromind_exception_handler)
    app.add_exception_handler(ValueError, value_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
