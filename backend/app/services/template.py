import requests

def submit_to_meta(payload, workspace):
    url = f"https://graph.facebook.com/v19.0/{workspace.meta_waba_id}/message_templates"

    headers = {
        "Authorization": f"Bearer {workspace.meta_access_token}",
        "Content-Type": "application/json"
    }

    res = requests.post(url, json=payload, headers=headers, timeout=10)

    return res.json()