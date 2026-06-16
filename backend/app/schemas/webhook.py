from pydantic import BaseModel

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

