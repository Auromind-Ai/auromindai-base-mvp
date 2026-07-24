import logging
import os
import sys
import tempfile

# project root path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
LOG_DIR = os.path.join(BASE_DIR, "logs")
LOG_FILE = os.path.join(LOG_DIR, "app.log")
FALLBACK_LOG_DIR = os.path.join(tempfile.gettempdir(), "auromind_logs")
FALLBACK_LOG_FILE = os.path.join(FALLBACK_LOG_DIR, "app.log")

logger = logging.getLogger("auromind")
logger.setLevel(logging.INFO)
logger.propagate = False

formatter = logging.Formatter(
    "%(asctime)s | %(levelname)s | %(message)s"
)

# Console handler (always available)
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

# File handler (fallback to temp directory if primary directory/file is not writable)
try:
    os.makedirs(LOG_DIR, exist_ok=True)
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
except Exception as primary_err:
    try:
        os.makedirs(FALLBACK_LOG_DIR, exist_ok=True)
        fallback_handler = logging.FileHandler(FALLBACK_LOG_FILE)
        fallback_handler.setFormatter(formatter)
        logger.addHandler(fallback_handler)
    except Exception as fallback_err:
        sys.stderr.write(
            f"Warning: Could not initialize file logging to {LOG_FILE} ({primary_err}) "
            f"or fallback {FALLBACK_LOG_FILE} ({fallback_err}). Console logging active.\n"
        )