import pytest
from app.schemas.account import (
    AccountDeletionRequestResponse,
    AccountDeletionCancelResponse,
)


def test_account_deletion_request_schema():
    data = {
        "deletion_scheduled_at": "2026-08-27T00:00:00+00:00",
        "message": "Your account is scheduled for deletion on August 27, 2026.",
    }
    schema = AccountDeletionRequestResponse(**data)
    assert schema.deletion_scheduled_at == data["deletion_scheduled_at"]
    assert schema.message == data["message"]


def test_account_deletion_cancel_schema():
    data = {
        "message": "Account deletion cancelled. Your account has been fully restored."
    }
    schema = AccountDeletionCancelResponse(**data)
    assert schema.message == data["message"]
