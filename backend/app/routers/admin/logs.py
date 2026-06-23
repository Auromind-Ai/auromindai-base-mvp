from fastapi import APIRouter
import os

router = APIRouter()

LOG_FILE = "logs/app.log"

@router.get("/logs")
async def get_logs():

    if not os.path.exists(LOG_FILE):
        return []

    logs = []

    with open(LOG_FILE, "r") as f:
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