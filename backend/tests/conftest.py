import sys
import os
import pytest
import json
import secrets
from datetime import datetime, timezone

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI
from fastapi.testclient import TestClient


class InMemoryRedisMock:
    def __init__(self):
        self.store = {}
        self.ttls = {}

    def ping(self):
        return True

    def setex(self, key, ttl, value):
        self.store[key] = str(value)
        self.ttls[key] = ttl
        return True

    def get(self, key):
        return self.store.get(key)

    def delete(self, *keys):
        count = 0
        for k in keys:
            if k in self.store:
                del self.store[k]
                if k in self.ttls:
                    del self.ttls[k]
                count += 1
        return count

    def getdel(self, key):
        val = self.store.pop(key, None)
        self.ttls.pop(key, None)
        return val

    def incr(self, key):
        val = int(self.store.get(key, 0)) + 1
        self.store[key] = str(val)
        return val

    def decr(self, key):
        val = max(0, int(self.store.get(key, 0)) - 1)
        self.store[key] = str(val)
        return val

    def expire(self, key, ttl):
        self.ttls[key] = ttl
        return True

    def keys(self, pattern="*"):
        prefix = pattern.replace("*", "")
        return [k for k in self.store.keys() if k.startswith(prefix)]


@pytest.fixture
def redis_mock():
    mock = InMemoryRedisMock()
    import app.core.rate_limit
    import app.routers.auth
    app.core.rate_limit._get_redis_client.override = mock
    app.routers.auth._get_redis_client.override = mock
    yield mock
    mock.store.clear()
    mock.ttls.clear()


@pytest.fixture
def mock_config():
    import app.services.config_service
    original_get = app.services.config_service.config_service.get
    app.services.config_service.config_service.get = lambda key, default=None: (
        "http://localhost:3000/auth/callback" if "redirect" in key else ("test_client_id" if "client_id" in key else default)
    )
    yield
    app.services.config_service.config_service.get = original_get


@pytest.fixture
def mock_db_session():
    from unittest.mock import MagicMock
    db = MagicMock()
    # Mock query filter for ImpersonationSession
    db.query.return_value.filter.return_value.first.return_value = None
    return db


@pytest.fixture
def test_app(redis_mock, mock_config, mock_db_session):
    from app.core.rate_limit import RateLimitMiddleware
    from app.routers import auth
    from app.database import get_db

    app = FastAPI()
    app.add_middleware(RateLimitMiddleware)

    # Override get_db to return mock DB session
    app.dependency_overrides[get_db] = lambda: mock_db_session

    @app.post("/upload")
    async def upload_endpoint():
        return {"status": "success"}

    @app.get("/brain/chat")
    async def brain_endpoint():
        return {"status": "success"}

    app.include_router(auth.router, prefix="/auth")
    return app


@pytest.fixture
def client(test_app):
    return TestClient(test_app)
