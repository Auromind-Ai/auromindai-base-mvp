import requests

class InstagramService:
    def __init__(self, access_token, page_id):
        self.access_token = access_token
        self.page_id = page_id

    def send_message(self, recipient_id: str, text: str):
        url = f"https://graph.facebook.com/v19.0/{self.page_id}/messages"

        payload = {
            "recipient": {"id": recipient_id},
            "message": {"text": text}
        }

        params = {
            "access_token": self.access_token
        }

        res = requests.post(url, json=payload, params=params, timeout=10)

        return res.json()