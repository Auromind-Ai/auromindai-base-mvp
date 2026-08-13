import requests

def submit_to_meta(payload, workspace):
    url = f"https://graph.facebook.com/v19.0/{workspace.meta_waba_id}/message_templates"

    from app.services.config_service import config_service

    system_token = config_service.get("meta_system_user_token")

    if not system_token:
        raise ValueError("Meta System User Token is not configured")

    headers = {
        "Authorization": f"Bearer {system_token}",
        "Content-Type": "application/json"
    }

    res = requests.post(url, json=payload, headers=headers, timeout=30)

    return res.json()