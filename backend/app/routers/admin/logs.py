from fastapi import APIRouter
import os
import re
import tempfile
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

LOG_FILE = "logs/app.log"
FALLBACK_LOG_FILE = os.path.join(tempfile.gettempdir(), "auromind_logs", "app.log")

@router.get("/logs")
async def get_logs():
    target_file = None
    if os.path.exists(LOG_FILE):
        target_file = LOG_FILE
    elif os.path.exists(FALLBACK_LOG_FILE):
        target_file = FALLBACK_LOG_FILE
    else:
        return []

    lines = []
    try:
        with open(target_file, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()[-300:]  # last 300 logs
    except Exception as e:
        logger.warning(f"Error reading log file {target_file}: {e}")
        return []

    logs = []
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        parts = [p.strip() for p in line.split("|")]
        
        if len(parts) >= 3:
            timestamp = parts[0].replace(",", ".")
            level = parts[1].upper()
            message = parts[2]
            status = ""
            duration = ""

            for extra in parts[3:]:
                if "Status" in extra or extra.isdigit():
                    status = extra.replace("Status", "").strip()
                elif extra.endswith("s") and any(c.isdigit() for c in extra):
                    duration = extra.strip()

            # Default status for level if not explicitly present in log format
            if not status:
                if level == "ERROR":
                    status = "500"
                elif level == "WARNING":
                    status = "400"
                elif level == "INFO":
                    status = "200"

            logs.append({
                "id": i,
                "timestamp": timestamp,
                "level": level,
                "message": message,
                "status": status,
                "duration": duration
            })
        else:
            # Single-line or unstructured message
            logs.append({
                "id": i,
                "timestamp": "",
                "level": "INFO",
                "message": line,
                "status": "200",
                "duration": ""
            })

    return logs