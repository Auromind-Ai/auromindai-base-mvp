import requests


def submit_to_meta(template, workspace):
    url = f"https://graph.facebook.com/v19.0/{workspace.meta_waba_id}/message_templates"

    payload = {
        "name": template.name,
        "language": template.language or "en",
        "category": template.category or "MARKETING",
        "components": [
            {
                "type": "BODY",
                "text": template.content
            }
        ]
    }

    headers = {
        "Authorization": f"Bearer {workspace.meta_access_token}",
        "Content-Type": "application/json"
    }

    res = requests.post(url, json=payload, headers=headers)

    return res.json()