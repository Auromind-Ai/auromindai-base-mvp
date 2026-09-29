import base64
import hashlib
import hmac
import json
import time

from fastapi import HTTPException
from app.core.config import settings


def sign_integration_state(user_id, workspace_id, integration_type):
    payload = base64.urlsafe_b64encode(json.dumps({
        "user_id": str(user_id), "workspace_id": str(workspace_id),
        "integration_type": integration_type, "issued_at": int(time.time()),
    }).encode()).decode()
    signature = hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def read_integration_state(state):
    try:
        payload, signature = state.rsplit(".", 1)
        expected = hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise ValueError("Invalid signature")
        data = json.loads(base64.urlsafe_b64decode(payload))
        age = time.time() - data["issued_at"]
        if not 0 <= age <= 600:
            raise ValueError("Expired state")
        return data
    except (ValueError, TypeError, KeyError):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state. Connect the account again.")
