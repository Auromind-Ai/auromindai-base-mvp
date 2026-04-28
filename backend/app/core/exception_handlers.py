from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from app.core.exceptions import (
    AuromindException,
    BillingError,
    GuardrailError,
    ChatProcessingError,
    RAGError,
    WorkspaceAccessError,
)
from app.core.logger import logger


async def billing_error_handler(request: Request, exc: BillingError):
    logger.warning(f"Billing error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        content={
            "error": "billing_error",
            "message": str(exc),
        },
    )


async def guardrail_error_handler(request: Request, exc: GuardrailError):
    logger.warning(f"Guardrail violation: {exc}")
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "error": "guardrail_violation",
            "message": str(exc),
        },
    )


async def chat_processing_error_handler(request: Request, exc: ChatProcessingError):
    logger.error(f"Chat processing error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "chat_processing_error",
            "message": str(exc),
        },
    )


async def rag_error_handler(request: Request, exc: RAGError):
    logger.error(f"RAG retrieval error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "rag_error",
            "message": "Failed to retrieve knowledge base information.",
        },
    )


async def workspace_access_error_handler(request: Request, exc: WorkspaceAccessError):
    logger.warning(f"Workspace access denied: {exc}")
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "error": "workspace_access_denied",
            "message": str(exc),
        },
    )


async def general_exception_handler(request: Request, exc: AuromindException):
    logger.error(f"Unhandled Auromind exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "internal_error",
            "message": "An unexpected error occurred.",
        },
    )


def register_exception_handlers(app: FastAPI):
    """Register all exception handlers with the FastAPI app."""
    app.add_exception_handler(BillingError, billing_error_handler)
    app.add_exception_handler(GuardrailError, guardrail_error_handler)
    app.add_exception_handler(ChatProcessingError, chat_processing_error_handler)
    app.add_exception_handler(RAGError, rag_error_handler)
    app.add_exception_handler(WorkspaceAccessError, workspace_access_error_handler)
    app.add_exception_handler(AuromindException, general_exception_handler)
