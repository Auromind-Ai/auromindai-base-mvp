import pytest
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from jose import jwt
from app.core.config import settings
from app.core.csrf_middleware import csrf_protection_middleware

app = FastAPI()
app.middleware("http")(csrf_protection_middleware)

@app.post("/protected/action")
async def protected_action():
    return {"status": "ok"}

@app.post("/auth/login")
async def public_login():
    return {"status": "login_ok"}

@app.post("/admin/action")
async def admin_action():
    return {"status": "admin_ok"}

client = TestClient(app)

def test_csrf_middleware_blocks_mutating_request_without_token():
    token_data = {"csrf_token": "valid_secret_csrf_123"}
    jwt_token = jwt.encode(token_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    client.cookies.set("auth_token", jwt_token)
    res = client.post("/protected/action")
    assert res.status_code == 403
    assert res.json()["success"] is False
    assert res.json()["error_code"] == "FORBIDDEN"

def test_csrf_middleware_allows_valid_csrf_token():
    token_data = {"csrf_token": "valid_secret_csrf_123"}
    jwt_token = jwt.encode(token_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    client.cookies.set("auth_token", jwt_token)
    res = client.post(
        "/protected/action",
        headers={"X-CSRF-Token": "valid_secret_csrf_123"}
    )
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

def test_csrf_middleware_blocks_mismatched_csrf_token():
    token_data = {"csrf_token": "valid_secret_csrf_123"}
    jwt_token = jwt.encode(token_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    client.cookies.set("auth_token", jwt_token)
    res = client.post(
        "/protected/action",
        headers={"X-CSRF-Token": "wrong_csrf_token"}
    )
    assert res.status_code == 403

def test_csrf_middleware_bypasses_public_and_admin_routes():
    # Public auth login bypasses user CSRF middleware
    res = client.post("/auth/login")
    assert res.status_code == 200
    assert res.json() == {"status": "login_ok"}

    # Admin sub-routes bypass user CSRF middleware (handled separately by AdminConsoleMiddleware)
    res_admin = client.post("/admin/action")
    assert res_admin.status_code == 200
    assert res_admin.json() == {"status": "admin_ok"}
