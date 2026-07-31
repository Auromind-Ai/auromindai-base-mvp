from pydantic import BaseModel


class AccountDeletionRequestResponse(BaseModel):
    deletion_scheduled_at: str
    message: str


class AccountDeletionCancelResponse(BaseModel):
    message: str
