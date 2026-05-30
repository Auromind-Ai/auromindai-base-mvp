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
