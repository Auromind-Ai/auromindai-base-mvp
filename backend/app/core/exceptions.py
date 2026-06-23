class AuromindException(Exception):
    """Base exception for Auromind application."""
    pass

class BillingError(AuromindException):
    """Raised when billing operations fail."""
    pass

class GuardrailError(AuromindException):
    """Raised when content fails guardrails check."""
    pass

class ChatProcessingError(AuromindException):
    """Raised when chat processing fails."""
    pass

class RAGError(AuromindException):
    """Raised when RAG retrieval fails."""
    pass

class WorkspaceAccessError(AuromindException):
    """Raised when user lacks workspace access."""
    pass

class AIProviderError(AuromindException):
    """Raised when an external AI provider fails."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


def get_ai_provider_error_details(exc: Exception, operation: str = "general") -> tuple[str, int]:
    exc_name = type(exc).__name__.lower()
    exc_str = str(exc).lower()
    
    # Default status and operation-specific default messages
    status_code = 500
    if operation == "flow":
        safe_msg = "Unable to generate the automation flow right now. Please try again in a few moments."
    elif operation == "template":
        safe_msg = "Unable to generate templates right now. Please try again later."
    else:
        safe_msg = "Unable to process your request at the moment. Please try again later."

    # 1. Check for Rate Limit / Quota Exceeded -> 429
    is_rate_limit = (
        "rate" in exc_name or 
        "quota" in exc_name or 
        "limit" in exc_name or 
        "rate_limit" in exc_str or 
        "quota exceeded" in exc_str or
        "resourceexhausted" in exc_name or
        getattr(exc, "status_code", None) == 429 or
        (hasattr(exc, "response") and getattr(exc.response, "status_code", None) == 429)
    )
    if is_rate_limit:
        return "The AI service is currently busy. Please try again in a few moments.", 429

    # 2. Check for Authentication / Invalid API Key -> 503
    is_auth_error = (
        "auth" in exc_name or 
        "permission" in exc_name or
        "unauthenticated" in exc_name or
        "key" in exc_str or 
        "api key" in exc_str or 
        "authentication" in exc_str or
        getattr(exc, "status_code", None) in (401, 403) or
        (hasattr(exc, "response") and getattr(exc.response, "status_code", None) in (401, 403))
    )
    if is_auth_error:
        return "The AI service is temporarily unavailable. Please try again later.", 503

    # 3. Check for Service Unavailable / Connection Error -> 503
    is_unavailable = (
        "connection" in exc_name or 
        "unavailable" in exc_name or 
        "timeout" in exc_name or 
        "server error" in exc_str or 
        "service unavailable" in exc_str or
        getattr(exc, "status_code", None) in (502, 503, 504) or
        (hasattr(exc, "response") and getattr(exc.response, "status_code", None) in (502, 503, 504))
    )
    if is_unavailable:
        return "The AI service is temporarily unavailable. Please try again later.", 503

    # 4. Unknown/General Failure -> 500
    return safe_msg, status_code

