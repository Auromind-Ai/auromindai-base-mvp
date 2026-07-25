import re
from pydantic import BaseModel, field_validator

class SendReply(BaseModel):
    conversation_id: str
    message: str
    phone: str | None = None
    metadata: dict | None = None

class AISuggest(BaseModel):
    conversation_id: str
    message: str


class TwilioConnectRequest(BaseModel):
    sid: str
    token: str
    phone: str
    workspace_id: str
    messaging_service_sid: str | None = None

    @field_validator("sid")
    @classmethod
    def validate_sid(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^AC[a-zA-Z0-9]{32}$", v):
            raise ValueError("Twilio Account SID must start with 'AC' followed by 32 alphanumeric characters")
        return v

    @field_validator("token")
    @classmethod
    def validate_token(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[a-zA-Z0-9]{32}$", v):
            raise ValueError("Twilio Auth Token must be a 32-character alphanumeric string")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\+[1-9]\d{6,14}$", v):
            raise ValueError("Phone number must follow Twilio's E.164 format, starting with '+' followed by 7 to 15 digits (e.g., +14155552671)")
        return v

    @field_validator("messaging_service_sid")
    @classmethod
    def validate_messaging_service_sid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if v == "":
            return None
        if not re.match(r"^MG[a-zA-Z0-9]{32}$", v):
            raise ValueError("Messaging Service SID must start with 'MG' followed by 32 alphanumeric characters")
        return v

