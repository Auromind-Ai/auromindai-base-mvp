from fastapi import APIRouter
import os
import tempfile

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

    logs = []

    with open(target_file, "r") as f:
        lines = f.readlines()[-200:]  # last 200 logs

    for i, line in enumerate(lines):

        parts = [p.strip() for p in line.split("|")]

        if len(parts) < 3:
            continue

        endpoint = parts[2] if len(parts) > 2 else ""
        status = parts[3].replace("Status", "").strip() if len(parts) > 3 else ""
        duration = parts[4] if len(parts) > 4 else ""

        logs.append({
            "id": i,
            "timestamp": parts[0].replace(",", "."),
            "level": parts[1],
            "message": endpoint,
            "status": status,
            "duration": duration
        })

    return logs