import pytest
import uuid
from datetime import datetime, timedelta, timezone as dt_timezone
import pytz
from unittest.mock import patch, MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models.integration import CalendarEvent, Integration
from app.models.workspace import Workspace
from app.routers.calendar import router as calendar_router
from app.database import get_db
from app.routers.auth import get_current_user


class MockCurrentUser:
    def __init__(self, user_id, workspace_id):
        self.id = user_id
        self.email = "testuser@example.com"
        self.full_name = "Test User"
        self.workspace_id = workspace_id


@pytest.fixture
def workspace_id(db_session):
    ws_id = uuid.uuid4()
    ws = Workspace(id=ws_id, name="API Test Company")
    db_session.add(ws)
    db_session.commit()
    return ws_id


@pytest.fixture
def app_client(db_session, workspace_id):
    app = FastAPI()
    app.include_router(calendar_router)

    current_user = MockCurrentUser(uuid.uuid4(), workspace_id)
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: current_user

    with patch("app.routers.calendar.verify_workspace_access", return_value=str(workspace_id)):
        yield TestClient(app)


class TestCalendarAPIRoutes:
    def test_get_calendar_status_disconnected(self, app_client):
        resp = app_client.get("/calendar/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["connected"] is False

    def test_get_calendar_status_connected(self, app_client, db_session, workspace_id):
        integration = Integration(
            workspace_id=workspace_id,
            integration_type="google_calendar",
            access_token="valid-token-xyz",
            refresh_token="valid-refresh-token",
            connected_email="calendar_owner@example.com",
            is_active=True
        )
        db_session.add(integration)
        db_session.commit()

        resp = app_client.get("/calendar/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["connected"] is True
        assert data["email"] == "calendar_owner@example.com"

    def test_get_calendar_availability(self, app_client):
        target_date = (datetime.now(pytz.utc) + timedelta(days=2)).strftime("%Y-%m-%d")
        resp = app_client.get(f"/calendar/availability?date={target_date}&timezone=Asia/Kolkata")
        assert resp.status_code == 200
        data = resp.json()
        assert "available_slots" in data
        assert data["count"] > 0

    def test_create_reschedule_cancel_appointment_api(self, app_client, db_session, workspace_id):
        target_date = (datetime.now(pytz.utc) + timedelta(days=2)).strftime("%Y-%m-%d")
        payload = {
            "meeting_date": target_date,
            "meeting_time": "10:00 AM",
            "timezone": "Asia/Kolkata",
            "name": "API Client",
            "email": "apiclient@example.com",
            "phone": "+919988776655",
            "notes": "Testing calendar API"
        }

        with patch("app.services.email_service.EmailService.send_email"):
            # 1. Create
            post_resp = app_client.post("/calendar/events", json=payload)
            assert post_resp.status_code == 200
            event_data = post_resp.json()
            assert event_data["status"] == "success"
            event_id = event_data["event_id"]

            # 2. List
            list_resp = app_client.get("/calendar/events")
            assert list_resp.status_code == 200
            events_list = list_resp.json()
            assert len(events_list) >= 1
            assert any(e["id"] == event_id for e in events_list)

            # 3. Reschedule
            resched_date = (datetime.now(pytz.utc) + timedelta(days=3)).strftime("%Y-%m-%d")
            resched_payload = {
                "new_date": resched_date,
                "new_time": "02:30 PM",
                "new_timezone": "Asia/Kolkata"
            }
            resched_resp = app_client.put(f"/calendar/events/{event_id}/reschedule", json=resched_payload)
            assert resched_resp.status_code == 200
            resched_data = resched_resp.json()
            assert resched_data["status"] == "success"

            # 4. Cancel
            delete_resp = app_client.delete(f"/calendar/events/{event_id}")
            assert delete_resp.status_code == 200
            assert delete_resp.json()["status"] == "success"
