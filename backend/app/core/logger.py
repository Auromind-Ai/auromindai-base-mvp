import logging
import os
import re
import sys
import tempfile

# Regex patterns for redacting sensitive fields
SENSITIVE_PATTERNS = [
    (re.compile(r'(?i)(password|passwd|pwd|secret|api_key|apikey|access_token|refresh_token|auth_token|totp_secret|private_key|razorpay_signature|key_secret)\s*[:=]\s*["\']?([^"\'\s,;]+)["\']?'), r'\1: [REDACTED]'),
    (re.compile(r'(?i)(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*'), r'\1[REDACTED]'),
    (re.compile(r'\b(?:\d{4}[ -]?){3}\d{4}\b'), r'[REDACTED_CARD]'),
]


class SensitiveDataFilter(logging.Filter):
   
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            for pattern, replacement in SENSITIVE_PATTERNS:
                record.msg = pattern.sub(replacement, record.msg)
        if record.args:
            if isinstance(record.args, dict):
                cleaned_args = {}
                for k, v in record.args.items():
                    if any(s in k.lower() for s in ("password", "secret", "token", "key", "signature")):
                        cleaned_args[k] = "[REDACTED]"
                    else:
                        cleaned_args[k] = v
                record.args = cleaned_args
            elif isinstance(record.args, tuple):
                cleaned_list = []
                for item in record.args:
                    if isinstance(item, str):
                        for pattern, replacement in SENSITIVE_PATTERNS:
                            item = pattern.sub(replacement, item)
                    cleaned_list.append(item)
                record.args = tuple(cleaned_list)
        return True


class WebSocketNoiseFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if record.levelno < logging.ERROR:
            msg = record.getMessage()
            if any(term in msg for term in (
                "WebSocket connected",
                "WebSocket disconnected",
                "WebSocket disconnect",
                "WebSocket cleanup",
                "conversation subscribed",
                "conversation unsubscribed",
                "connection open",
                "connection closed",
            )):
                return False
        return True


# project root path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
LOG_DIR = os.path.join(BASE_DIR, "logs")
LOG_FILE = os.path.join(LOG_DIR, "app.log")
FALLBACK_LOG_DIR = os.path.join(tempfile.gettempdir(), "auromind_logs")
FALLBACK_LOG_FILE = os.path.join(FALLBACK_LOG_DIR, "app.log")

logger = logging.getLogger("auromind")
logger.setLevel(logging.INFO)
logger.propagate = False

sensitive_filter = SensitiveDataFilter()
ws_noise_filter = WebSocketNoiseFilter()

logger.addFilter(sensitive_filter)
logger.addFilter(ws_noise_filter)

formatter = logging.Formatter(
    "%(asctime)s | %(levelname)s | %(message)s"
)

# Console handler (always available)
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
console_handler.addFilter(sensitive_filter)
console_handler.addFilter(ws_noise_filter)
logger.addHandler(console_handler)

# File handler (fallback to temp directory if primary directory/file is not writable)
try:
    os.makedirs(LOG_DIR, exist_ok=True)
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setFormatter(formatter)
    file_handler.addFilter(sensitive_filter)
    file_handler.addFilter(ws_noise_filter)
    logger.addHandler(file_handler)
except Exception as primary_err:
    try:
        os.makedirs(FALLBACK_LOG_DIR, exist_ok=True)
        fallback_handler = logging.FileHandler(FALLBACK_LOG_FILE)
        fallback_handler.setFormatter(formatter)
        fallback_handler.addFilter(sensitive_filter)
        fallback_handler.addFilter(ws_noise_filter)
        logger.addHandler(fallback_handler)
    except Exception as fallback_err:
        sys.stderr.write(
            f"Warning: Could not initialize file logging to {LOG_FILE} ({primary_err}) "
            f"or fallback {FALLBACK_LOG_FILE} ({fallback_err}). Console logging active.\n"
        )

# Apply filter to root logger as well to catch any propagated logs
logging.getLogger().addFilter(ws_noise_filter)

# Silence noisy external websockets libraries
for _lib in ("websockets", "websockets.server", "websockets.protocol"):
    logging.getLogger(_lib).setLevel(logging.WARNING)

