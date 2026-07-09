import os
import sys
from unittest.mock import MagicMock

# Properly mock google and google.genai namespace package before any imports
google_mock = MagicMock()
genai_mock = MagicMock()
google_mock.genai = genai_mock
google_mock.generativeai = genai_mock
sys.modules["google"] = google_mock
sys.modules["google.genai"] = genai_mock
sys.modules["google.generativeai"] = genai_mock

if "ENCRYPTION_KEY" not in os.environ or len(os.environ.get("ENCRYPTION_KEY", "")) < 32:
    os.environ["ENCRYPTION_KEY"] = "dGVzdF9rZXlfdGhhdF9pc18zMl9ieXRlc19sb25nXzE="

import pytest
from uuid import uuid4

from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from app.routers.auth import router as auth_router
from app.routers.admin.impersonate import router as impersonate_router, create_impersonation_session
from app.core.enums import PlatformRole
from app.utils.auth import create_access_token

test_app = FastAPI()
test_app.include_router(auth_router, prefix="/auth")
test_app.include_router(impersonate_router, prefix="/admin")

client = TestClient(test_app)

def test_impersonation_stop_and_logout():
    admin_id = str(uuid4())
    user_id = str(uuid4())
    workspace_id = str(uuid4())

    admin_token = create_access_token(
        data={
            "sub": admin_id,
            "email": "admin@auromind.ai",
            "platform_role": PlatformRole.PLATFORM_ADMIN.value,
            "role": PlatformRole.PLATFORM_ADMIN.value,
            "workspace_id": workspace_id
        }
    )

    impersonated_token = create_access_token(
        data={
            "sub": user_id,
            "email": "user@auromind.ai",
            "workspace_id": workspace_id,
            "impersonated": True,
            "admin_id": admin_id
        }
    )

    # 1. Test stop-impersonation without backup token -> 400
    res = client.post("/auth/stop-impersonation")
    assert res.status_code == status.HTTP_400_BAD_REQUEST

    # 2. Test stop-impersonation with backup token -> 200 Success
    client.cookies.set("admin_backup_token", admin_token)
    res_stop = client.post("/auth/stop-impersonation")
    assert res_stop.status_code == status.HTTP_200_OK
    assert res_stop.json()["status"] == "success"

    # 3. Test logout clears all cookies
    client.cookies.set("auth_token", impersonated_token)
    client.cookies.set("admin_session", "dummy_admin_session")
    client.cookies.set("admin_backup_token", admin_token)

    res_logout = client.post("/auth/logout")
    assert res_logout.status_code == status.HTTP_200_OK
    assert res_logout.json()["status"] == "success"

def test_prevent_nested_impersonation():
    user_id = uuid4()
    
    mock_admin = MagicMock()
    mock_admin.impersonated = True
    
    with pytest.raises(Exception) as exc_info:
        create_impersonation_session(
            user_id=user_id,
            db=MagicMock(),
            current_admin=mock_admin
        )
    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Already impersonating" in exc_info.value.detail
