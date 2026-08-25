import pytest
import uuid
from datetime import datetime, timedelta, timezone as dt_timezone
import pytz
from unittest.mock import MagicMock, patch

from app.models.integration import CalendarEvent, Integration
from app.models.workspace import Workspace
from app.services.email_automation.calender_executor import CalendarExecutor
from app.services.integration_service import IntegrationService, SCOPES


@pytest.fixture
def workspace_id(db_session):
    ws_id = uuid.uuid4()
    ws = Workspace(id=ws_id, name="Test Company")
    db_session.add(ws)
    db_session.commit()
    return ws_id


@pytest.fixture
def executor():
    return CalendarExecutor()


class TestGoogleCalendarOAuth:
    def test_oauth_scopes(self):
        assert "https://www.googleapis.com/auth/calendar" in SCOPES["calendar"]
        assert "https://www.googleapis.com/auth/calendar.events" in SCOPES["calendar"]
        assert "https://www.googleapis.com/auth/calendar" in SCOPES["google_calendar"]

    def test_oauth_url_generation(self, db_session, workspace_id):
        with patch("app.services.config_service.config_service.get") as mock_get:
            mock_get.side_effect = lambda k, default=None: {
                "google_client_id": "test-client-id",
                "google_client_secret": "test-client-secret",
                "oauth_redirect_uri": "http://localhost:8000/integrations/google/callback"
            }.get(k, default)

            url = IntegrationService.get_google_oauth_url(db_session, str(workspace_id), "calendar")
            assert "accounts.google.com" in url
            assert "test-client-id" in url
            assert f"calendar%3A{workspace_id}" in url or f"calendar:{workspace_id}" in url


class TestTimezoneHandling:
    def test_timezone_normalization(self, executor):
        assert executor.normalize_timezone("IST") == "Asia/Kolkata"
        assert executor.normalize_timezone("est") == "America/New_York"
        assert executor.normalize_timezone("pst") == "America/Los_Angeles"
        assert executor.normalize_timezone("cst") == "America/Chicago"
        assert executor.normalize_timezone("utc") == "UTC"
        assert executor.normalize_timezone("Asia/Kolkata") == "Asia/Kolkata"
        assert executor.normalize_timezone("America/New_York") == "America/New_York"

    def test_parse_meeting_datetime(self, executor):
        future_date = (datetime.now(pytz.utc) + timedelta(days=2)).strftime("%Y-%m-%d")
        result = executor.parse_meeting_datetime(future_date, "3:30 PM", "IST")
        
        assert result["timezone"] == "Asia/Kolkata"
        assert result["time"] == "03:30 PM"
        assert result["local_datetime"].tzinfo is not None
        assert result["utc_datetime"].tzinfo is not None
        assert result["date"] == future_date

    def test_parse_meeting_datetime_relative(self, executor):
        # Test 'tomorrow' with time
        result = executor.parse_meeting_datetime("tomorrow", "6:00 PM", "IST")
        tz = pytz.timezone("Asia/Kolkata")
        expected_date = (datetime.now(tz) + timedelta(days=1)).strftime("%Y-%m-%d")
        assert result["timezone"] == "Asia/Kolkata"
        assert result["date"] == expected_date
        assert result["time"] == "06:00 PM"

        # Test 'day after tomorrow'
        result2 = executor.parse_meeting_datetime("day after tomorrow", "10:30 AM", "IST")
        expected_date2 = (datetime.now(tz) + timedelta(days=2)).strftime("%Y-%m-%d")
        assert result2["date"] == expected_date2
        assert result2["time"] == "10:30 AM"

    def test_parse_past_meeting_raises_error(self, executor):
        past_date = (datetime.now(pytz.utc) - timedelta(days=2)).strftime("%Y-%m-%d")
        with pytest.raises(ValueError, match="already passed"):
            executor.parse_meeting_datetime(past_date, "10:00 AM", "IST")


class TestAvailabilityAndConflictDetection:
    def test_conflict_detection_with_local_db(self, db_session, workspace_id, executor):
        # Create an existing event in DB
        event_time_utc = datetime.now(pytz.utc) + timedelta(days=1, hours=3)
        event = CalendarEvent(
            workspace_id=workspace_id,
            title="Existing Client Demo",
            event_date=event_time_utc,
            event_time=event_time_utc.strftime("%I:%M %p"),
            timezone="UTC",
            status="scheduled",
            created_at=datetime.now(dt_timezone.utc)
        )
        db_session.add(event)
        db_session.commit()

        # Check conflict on exact same time
        conflict = executor.conflict_detection(
            db_session,
            {"utc_datetime": event_time_utc},
            str(workspace_id),
            duration_minutes=30
        )
        assert conflict is True

        # Check non-conflicting time (4 hours later)
        no_conflict = executor.conflict_detection(
            db_session,
            {"utc_datetime": event_time_utc + timedelta(hours=4)},
            str(workspace_id),
            duration_minutes=30
        )
        assert no_conflict is False

    def test_get_available_slots(self, db_session, workspace_id, executor):
        target_date = (datetime.now(pytz.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
        slots = executor.get_available_slots(
            db=db_session,
            workspace_id=str(workspace_id),
            target_date=target_date,
            timezone_str="Asia/Kolkata",
            slot_duration_minutes=30,
            start_hour=10,
            end_hour=12,
            days_ahead=1
        )
        assert len(slots) > 0
        assert all("time" in s and "timezone" in s for s in slots)


class TestAppointmentBookingAndLifecycle:
    def test_create_appointment_full_flow(self, db_session, workspace_id, executor):
        future_date = (datetime.now(pytz.utc) + timedelta(days=2)).strftime("%Y-%m-%d")
        action = {
            "data": {
                "meeting_date": future_date,
                "meeting_time": "02:00 PM",
                "timezone": "IST",
                "name": "Jane Doe",
                "email": "jane.doe@example.com",
                "phone": "+919876543210",
                "notes": "Interested in enterprise agent workflow automation"
            },
            "sender": "+919876543210"
        }

        # Mock EmailService and Google Service
        with patch("app.services.email_service.EmailService.send_email") as mock_send_email, \
             patch.object(executor, "get_google_service", return_value=None):
            
            result = executor.execute(db_session, str(workspace_id), action)

            assert result is not None
            assert result["status"] == "success"
            assert result["client_name"] == "Jane Doe"
            assert result["client_email"] == "jane.doe@example.com"
            assert result["client_phone"] == "+919876543210"
            assert result["timezone"] == "Asia/Kolkata"

            # Check DB event record
            db_event = db_session.query(CalendarEvent).filter_by(id=uuid.UUID(result["event_id"])).first()
            assert db_event is not None
            assert db_event.client_name == "Jane Doe"
            assert db_event.client_email == "jane.doe@example.com"
            assert db_event.client_phone == "+919876543210"
            assert db_event.status == "scheduled"
            assert "Jane Doe" in db_event.title

            # Email confirmation was invoked
            mock_send_email.assert_called_once()

    def test_double_booking_prevention(self, db_session, workspace_id, executor):
        future_date = (datetime.now(pytz.utc) + timedelta(days=3)).strftime("%Y-%m-%d")
        action = {
            "data": {
                "meeting_date": future_date,
                "meeting_time": "04:00 PM",
                "timezone": "IST",
                "name": "Client One",
                "email": "c1@example.com"
            }
        }

        with patch("app.services.email_service.EmailService.send_email"), \
             patch.object(executor, "get_google_service", return_value=None):
            
            # First booking succeeds
            res1 = executor.execute(db_session, str(workspace_id), action)
            assert res1["status"] == "success"

            # Second booking on same slot triggers conflict prevention
            action2 = {
                "data": {
                    "meeting_date": future_date,
                    "meeting_time": "04:00 PM",
                    "timezone": "IST",
                    "name": "Client Two",
                    "email": "c2@example.com"
                }
            }
            res2 = executor.execute(db_session, str(workspace_id), action2)
            assert res2["status"] == "conflict"
            assert res2["conflict"] is True
            assert len(res2["alternative_slots"]) > 0

    def test_reschedule_appointment(self, db_session, workspace_id, executor):
        future_date = (datetime.now(pytz.utc) + timedelta(days=2)).strftime("%Y-%m-%d")
        resched_date = (datetime.now(pytz.utc) + timedelta(days=4)).strftime("%Y-%m-%d")

        action = {
            "data": {
                "meeting_date": future_date,
                "meeting_time": "11:00 AM",
                "timezone": "IST",
                "name": "Reschedule Tester",
                "email": "resched@example.com"
            }
        }

        with patch("app.services.email_service.EmailService.send_email"), \
             patch.object(executor, "get_google_service", return_value=None):
            
            created = executor.execute(db_session, str(workspace_id), action)
            event_id = created["event_id"]

            # Reschedule
            resched_res = executor.reschedule_appointment(
                db=db_session,
                workspace_id=str(workspace_id),
                new_date=resched_date,
                new_time="03:00 PM",
                new_timezone="IST",
                event_id=event_id
            )
            assert resched_res["status"] == "success"

            db_event = db_session.query(CalendarEvent).filter_by(id=uuid.UUID(event_id)).first()
            assert db_event.event_time == "03:00 PM"

    def test_cancel_appointment(self, db_session, workspace_id, executor):
        future_date = (datetime.now(pytz.utc) + timedelta(days=2)).strftime("%Y-%m-%d")
        action = {
            "data": {
                "meeting_date": future_date,
                "meeting_time": "01:00 PM",
                "timezone": "IST",
                "name": "Cancel Tester",
                "email": "cancel@example.com"
            }
        }

        with patch("app.services.email_service.EmailService.send_email"), \
             patch.object(executor, "get_google_service", return_value=None):
            
            created = executor.execute(db_session, str(workspace_id), action)
            event_id = created["event_id"]

            # Cancel
            cancel_res = executor.cancel_appointment(
                db=db_session,
                workspace_id=str(workspace_id),
                event_id=event_id
            )
            assert cancel_res["status"] == "success"

            db_event = db_session.query(CalendarEvent).filter_by(id=uuid.UUID(event_id)).first()
            assert db_event.status == "cancelled"
