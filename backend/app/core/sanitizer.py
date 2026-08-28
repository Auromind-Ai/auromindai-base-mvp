import re
from typing import Any, Optional

# Comprehensive technical keywords, frameworks, libraries, database engines, and runtime exceptions
TECHNICAL_PATTERNS = [
    # Stack traces & runtime errors
    r"(?i)\btraceback\b",
    r"(?i)\bstack\s*trace\b",
    r"(?i)\bfile\s+[\"'].*\.py[\"']",
    r"(?i)\bline\s+\d+\b",
    r"(?i)\b(?:typeerror|keyerror|valueerror|attributeerror|nameerror|indexerror|syntaxerror|runtimeerror|zerodivisionerror|operationalerror|integrityerror|programmingerror|databaseerror)\b",
    r"(?i)\bexception:\b",
    
    # Database & ORM internals
    r"(?i)\bpsycopg(?:2)?\b",
    r"(?i)\bsqlalchemy\b",
    r"(?i)\balembic\b",
    r"(?i)\bpostgres(?:ql)?\b",
    r"(?i)\bsqlite\b",
    r"(?i)\bselect\s+.+\s+from\b",
    r"(?i)\binsert\s+into\b",
    r"(?i)\bupdate\s+.+\s+set\b",
    r"(?i)\bdelete\s+from\b",
    r"(?i)\bviolates\s+(?:foreign\s+key|unique|not-null|check)\s+constraint\b",
    r"(?i)\bduplicate\s+key\s+value\b",
    r"(?i)\bcolumn\s+[\"']?\w+[\"']?\s+does\s+not\s+exist\b",
    r"(?i)\btable\s+[\"']?\w+[\"']?\s+does\s+not\s+exist\b",
    
    # Codecs & encoding
    r"(?i)\blatin-?1\b",
    r"(?i)\bunicode(?:decode|encode)error\b",
    r"(?i)\bcodec\s+can['’]?t\s+(?:en|de)code\b",
    r"(?i)\bordinal\s+not\s+in\s+range\b",
    
    # Internal infrastructure & queues
    r"(?i)\bredis\b",
    r"(?i)\bcelery\b",
    r"(?i)\brabbitmq\b",
    r"(?i)\baws\b",
    r"(?i)\bs3\b",
    r"(?i)\bboto(?:3)?\b",
    
    # Network & socket failures
    r"(?i)\b(?:connection\s+refused|econnrefused|econnreset|etimedout|err_network|socket\s+error|failed\s+to\s+fetch|host\s+unreachable|networkerror|load\s+failed|cors)\b",
    r"(?i)\b(?:ssl|tls)\s*(?:handshake|error|certificate|validation)\b",
    
    # Credentials & secrets (targeted at leaked values and internal secret keys)
    r"(?i)(?:password|passwd|pwd|secret|api_?key|api_?secret|access_?token|refresh_?token|auth_?token|system_?user_?token|private_?key|key_secret)\s*[:=]\s*[\"']?[^\"'\s,;]+",
    r"(?i)\b(?:api_?key|api_?secret|system_?user_?token|private_?key|jwt_secret|webhook_secret)\b",
    r"(?i)\b(?:bearer\s+[A-Za-z0-9\-\._~\+\/]+=*)\b",
    
    # Third-party vendor & provider names
    r"(?i)\brazorpay\b",
    r"(?i)\bpayu\b",
    r"(?i)\bpaypal\b",
    r"(?i)\bstripe\b",
    r"(?i)\bmeta\b",
    r"(?i)\bfacebook\b",
    r"(?i)\bwhatsapp\b",
    r"(?i)\bwaba\b",
    r"(?i)\binstagram\b",
    r"(?i)\btwilio\b",
    r"(?i)\bsendgrid\b",
    r"(?i)\bsmtp\b",
    r"(?i)\bopenai\b",
    r"(?i)\bgroq\b",
    r"(?i)\banthropic\b",
    r"(?i)\bclaude\b",
    r"(?i)\bgemini\b",
    r"(?i)\bdeepseek\b",
    r"(?i)\bgoogle\s+(?:api|cloud|oauth|meet|calendar|gmail)\b",
]

COMPILED_PATTERNS = [re.compile(p) for p in TECHNICAL_PATTERNS]

# Safe category-specific fallback messages
DEFAULT_GENERIC_ERROR = "An error occurred while processing your request. Please try again later or contact support."
DEFAULT_TIMEOUT_ERROR = "The request took too long to complete. Please try again later."
DEFAULT_NETWORK_ERROR = "Unable to connect to the server. Please check your connection and try again."
DEFAULT_PAYMENT_ERROR = "Payment operation could not be completed. Please verify your details or try again later."
DEFAULT_AUTH_ERROR = "Authentication failed or session expired. Please sign in again."
DEFAULT_AI_ERROR = "The AI assistant service is temporarily busy. Please try again in a few moments."
DEFAULT_DATABASE_ERROR = "A data processing error occurred. Please verify your input and try again."
DEFAULT_MESSAGING_ERROR = "Unable to complete messaging operation at this time. Please try again later."
DEFAULT_VALIDATION_ERROR = "Invalid request format. Please check the supplied information."


def contains_technical_leak(text: str) -> bool:
    """Returns True if the text contains technical details, stack traces, database terms, or vendor names."""
    if not text or not isinstance(text, str):
        return False
    return any(p.search(text) for p in COMPILED_PATTERNS)


def sanitize_user_message(
    msg: Any,
    status_code: int = 500,
    default_message: Optional[str] = None
) -> str:
   
    if msg is None:
        return default_message or DEFAULT_GENERIC_ERROR

    text_msg = str(msg).strip()
    if not text_msg:
        return default_message or DEFAULT_GENERIC_ERROR

    lower_msg = text_msg.lower()

    # Check for technical leakage
    if contains_technical_leak(text_msg):
        # 1. Timeout / Duration errors
        if status_code in (408, 504) or "timeout" in lower_msg or "timed out" in lower_msg:
            return DEFAULT_TIMEOUT_ERROR

        # 2. Network / Connection errors
        if any(w in lower_msg for w in ("connection", "econnrefused", "econnreset", "socket", "network", "fetch", "unreachable")):
            return DEFAULT_NETWORK_ERROR

        # 3. Payment / Gateway / Order / Subscription errors
        if any(w in lower_msg for w in ("payment", "razorpay", "payu", "stripe", "paypal", "order", "recharge", "subscription", "signature", "checkout")):
            return DEFAULT_PAYMENT_ERROR

        # 4. AI Provider / LLM / Model errors
        if any(w in lower_msg for w in ("openai", "groq", "anthropic", "claude", "gemini", "deepseek", "model", "token", "quota", "rate limit")):
            if status_code == 429 or "rate" in lower_msg or "quota" in lower_msg:
                return "The AI service is currently busy. Please try again in a few moments."
            return DEFAULT_AI_ERROR

        # 5. Messaging / Channels / Templates / Webhooks
        if any(w in lower_msg for w in ("whatsapp", "meta", "waba", "instagram", "facebook", "twilio", "template", "message", "sms")):
            return DEFAULT_MESSAGING_ERROR

        # 6. Database / SQL / Constraint violations
        if any(w in lower_msg for w in ("sql", "psycopg", "postgres", "constraint", "integrity", "table", "column", "violates")):
            if "duplicate" in lower_msg or "unique" in lower_msg:
                return "A record with this identifier already exists. Please check your data."
            return DEFAULT_DATABASE_ERROR

        # 7. Codec / Encoding errors
        if any(w in lower_msg for w in ("codec", "latin", "ordinal", "unicode")):
            return DEFAULT_GENERIC_ERROR

        # 8. Authentication / Authorization
        if status_code in (401, 403) or any(w in lower_msg for w in ("unauthorized", "forbidden", "token", "secret", "permission", "jwt")):
            return DEFAULT_AUTH_ERROR

        # Fallback to safe generic error
        return default_message or DEFAULT_GENERIC_ERROR

    # Return safe user-facing message if no technical leak detected
    return text_msg


def sanitize_validation_errors(errors: list | dict | None) -> list:
   
    if not errors:
        return []
    
    if isinstance(errors, dict):
        errors = [errors]

    cleaned = []
    for err in errors:
        if not isinstance(err, dict):
            continue

        raw_field = str(err.get("field") or err.get("loc") or "non_field_error")
        raw_msg = str(err.get("message") or err.get("msg") or "Invalid value")
        err_type = str(err.get("type") or "value_error")

        # Sanitize vendor-specific field names in user display
        field_display = raw_field
        for vendor in ("razorpay_", "meta_", "twilio_", "fb_", "ig_"):
            field_display = field_display.replace(vendor, "")

        # Clean technical Pydantic messages
        clean_msg = sanitize_user_message(raw_msg, status_code=422, default_message="Invalid value provided.")
        
        # If the msg had technical schema names, make it clean
        if contains_technical_leak(raw_msg):
            clean_msg = f"Invalid value for '{field_display}'"

        cleaned.append({
            "field": field_display,
            "message": clean_msg,
            "type": err_type if not contains_technical_leak(err_type) else "validation_error",
        })

    return cleaned
