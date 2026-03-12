import logging
import os

# create logs folder
os.makedirs("logs", exist_ok=True)

LOG_FILE = "logs/app.log"

logger = logging.getLogger("auromind")
logger.setLevel(logging.INFO)

# prevent duplicate logs
logger.propagate = False

# formatter
formatter = logging.Formatter(
    "%(asctime)s | %(levelname)s | %(message)s"
)

# file handler
file_handler = logging.FileHandler(LOG_FILE)
file_handler.setFormatter(formatter)

# console handler (optional)
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)

logger.addHandler(file_handler)
logger.addHandler(console_handler)