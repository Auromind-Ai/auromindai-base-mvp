import pytest
import uuid
from datetime import datetime, timedelta, timezone as dt_timezone
import pytz
from unittest.mock import MagicMock, patch

from app.models.integration import CalendarEvent, Integration
from app.models.workspace import Workspace
from app.services.email_service import EmailService
from app.services.email_automation.calender_executor import CalendarExecutor


@pytest.fixture
def workspace_id(db_session):
    ws_id = uuid.uuid4()
    ws = Workspace(id=ws_id, name="Automated Enterprise")
    db_session.add(ws)
    db_session.commit()
    return ws_id


class TestGmailAutomatedClientEmails:
    def test_send_email_via_connected_gmail_api(self, db_session, workspace_id):
        # Create active Gmail integration
        integration = Integration(
            workspace_id=workspace_id,
            integration_type="google_gmail",
            access_token="valid-gmail-token",
            refresh_token="valid-refresh-token",
            connected_email="sales@automatedenterprise.com",
            is_active=True
        )
        db_session.add(integration)
        db_session.commit()

        mock_messages = MagicMock()
        mock_messages.send.return_value.execute.return_value = {"id": "gmail_msg_12345"}
        mock_users = MagicMock()
        mock_users.messages.return_value = mock_messages
        mock_service = MagicMock()
        mock_service.users.return_value = mock_users

        with patch("app.services.email_service.EmailService.get_workspace_gmail_service", return_value=(mock_service, "sales@automatedenterprise.com")):
            result = EmailService.send_email_for_workspace(
                db=db_session,
                workspace_id=workspace_id,
                to_email="lead@clientcorp.com",
                subject="Your Demo Confirmation",
                body="<p>Demo confirmed at 3 PM</p>",
                plain_text="Demo confirmed at 3 PM"
            )

            assert result["status"] == "success"
            assert result["provider"] == "gmail"
            assert result["message_id"] == "gmail_msg_12345"
            assert result["sender"] == "sales@automatedenterprise.com"

            mock_messages.send.assert_called_once()

    def test_send_email_fallback_to_smtp_when_no_gmail(self, db_session, workspace_id):
        # No Gmail integration in DB
        with patch("app.services.email_service.EmailService.send_email", return_value={"status": "success", "message": "SMTP sent"}) as mock_smtp:
            result = EmailService.send_email_for_workspace(
                db=db_session,
                workspace_id=workspace_id,
                to_email="client@example.com",
                subject="Platform Welcome",
                body="<p>Welcome to our service</p>"
            )

            mock_smtp.assert_called_once()
            assert result["status"] == "success"

    def test_send_email_fallback_on_gmail_api_error(self, db_session, workspace_id):
        integration = Integration(
            workspace_id=workspace_id,
            integration_type="google_gmail",
            access_token="error-token",
            refresh_token="error-refresh-token",
            connected_email="error@example.com",
            is_active=True
        )
        db_session.add(integration)
        db_session.commit()

        mock_messages = MagicMock()
        mock_messages.send.return_value.execute.side_effect = Exception("Gmail API Quota Exceeded")
        mock_users = MagicMock()
        mock_users.messages.return_value = mock_messages
        mock_service = MagicMock()
        mock_service.users.return_value = mock_users

        with patch("app.services.email_service.EmailService.get_workspace_gmail_service", return_value=(mock_service, "error@example.com")), \
             patch("app.services.email_service.EmailService.send_email", return_value={"status": "success", "message": "SMTP fallback sent"}) as mock_smtp:
            
            result = EmailService.send_email_for_workspace(
                db=db_session,
                workspace_id=workspace_id,
                to_email="client@example.com",
                subject="Notice",
                body="<p>Test Notice</p>"
            )

            # Falls back cleanly to SMTP without raising uncaught exception
            mock_smtp.assert_called_once()
            assert result["status"] == "success"

    def test_booking_confirmation_dispatches_via_workspace_gmail(self, db_session, workspace_id):
        executor = CalendarExecutor()
        event_time_utc = datetime.now(pytz.utc) + timedelta(days=2)
        
        event = CalendarEvent(
            workspace_id=workspace_id,
            title="Enterprise Demo with Alice",
            description="Discuss AI agent deployment",
            event_date=event_time_utc,
            event_time="03:00 PM",
            timezone="Asia/Kolkata",
            client_name="Alice Smith",
            client_email="alice.smith@example.com",
            client_phone="+919876543210",
            status="scheduled",
            created_at=datetime.now(dt_timezone.utc)
        )
        db_session.add(event)
        db_session.commit()

        with patch("app.services.email_service.EmailService.send_email_for_workspace") as mock_ws_send:
            mock_ws_send.return_value = {"status": "success", "provider": "gmail", "message_id": "msg_booking_999"}

            res = executor.send_booking_confirmation_email(
                db=db_session,
                workspace_id=workspace_id,
                event=event,
                meet_link="https://meet.google.com/xyz-uvw-rst",
                is_reschedule=False
            )

            assert res["status"] == "success"
            assert res["provider"] == "gmail"

            mock_ws_send.assert_called_once()
            call_kwargs = mock_ws_send.call_args[1]
            assert call_kwargs["to_email"] == "alice.smith@example.com"
            assert "Confirmed:" in call_kwargs["subject"]
            assert "https://meet.google.com/xyz-uvw-rst" in call_kwargs["body"]
            assert "Alice Smith" in call_kwargs["body"]
            assert "Next Steps" in call_kwargs["body"]
