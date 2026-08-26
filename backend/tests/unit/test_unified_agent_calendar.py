import pytest
import uuid
from unittest.mock import MagicMock, AsyncMock, patch

from app.models.integration import CalendarEvent
from app.services.inbox_agents.unified_agent import UnifiedAgent
from app.services.inbox_agents.orchestration_layer import AgentOrchestration


from app.models.workspace import Workspace
from app.models.conversation import Conversation


@pytest.fixture
def workspace_id(db_session):
    ws_id = uuid.uuid4()
    ws = Workspace(id=ws_id, name="Test Company")
    db_session.add(ws)
    db_session.commit()
    return ws_id


@pytest.fixture
def conversation_id(db_session, workspace_id):
    c_id = uuid.uuid4()
    conv = Conversation(
        id=c_id,
        workspace_id=workspace_id,
        channel="WHATSAPP",
        phone="+19876543210"
    )
    db_session.add(conv)
    db_session.commit()
    return c_id


class TestUnifiedAgentCalendarPrompts:
    def test_lead_prompt_with_calendar_enabled(self):
        llm_mock = MagicMock()
        memory_mock = MagicMock()
        agent = UnifiedAgent(llm_mock, memory_mock)

        prompt = agent._build_lead_prompt(
            message="Let's meet tomorrow at 3pm IST",
            lead_data={"name": "Alice", "email": "alice@example.com", "phone": "+1234567890"},
            missing_fields=[],
            collected_fields={"name": "Alice", "email": "alice@example.com", "phone": "+1234567890"},
            next_field=None,
            history_text="Assistant: When would you like to schedule our demo?\nUser: Tomorrow 3pm",
            business_type="SaaS",
            lead_fields=["name", "email", "phone"],
            calendar_enabled=True
        )

        assert "Demo Booking & Appointment Assistant" in prompt
        assert "book_demo" in prompt
        assert "reschedule_demo" in prompt
        assert "cancel_demo" in prompt
        assert "meeting_date" in prompt
        assert "timezone" in prompt


class TestOrchestrationCalendarIntegration:
    @pytest.mark.asyncio
    async def test_orchestration_book_demo_success(self, db_session, workspace_id, conversation_id):
        orchestration = AgentOrchestration(db=db_session)
        orchestration.unified_agent.handle = AsyncMock(return_value={
            "stage": "lead",
            "action": "book_demo",
            "meeting_date": "2026-08-28",
            "meeting_time": "04:00 PM",
            "timezone": "IST",
            "collect": {"name": "Bob Smith", "email": "bob@example.com", "phone": "+19876543210"}
        })

        payload = {
            "workspace_id": str(workspace_id),
            "conversation_id": str(conversation_id),
            "user_id": "test_user_bob",
            "message": "Let's do 4pm on Aug 28th",
            "from": "+19876543210",
            "calendar_enabled": True,
            "lead_fields": ["name", "email", "phone"]
        }

        with patch("app.services.email_automation.calender_executor.CalendarExecutor.execute") as mock_cal_exec:
            mock_cal_exec.return_value = {
                "status": "success",
                "formatted_display": "Friday, August 28, 2026 at 04:00 PM",
                "timezone": "Asia/Kolkata",
                "meet_link": "https://meet.google.com/abc-defg-hij"
            }

            resp = await orchestration._process_message_internal_core(
                payload=payload,
                channel="whatsapp",
                skip_send=True,
                db=db_session
            )

            assert "Appointment Confirmed" in resp["text"]
            assert "https://meet.google.com/abc-defg-hij" in resp["text"]
            assert resp["metadata"]["escalate"] is True
            assert resp["metadata"]["close"] is True

    @pytest.mark.asyncio
    async def test_orchestration_book_demo_conflict(self, db_session, workspace_id, conversation_id):
        orchestration = AgentOrchestration(db=db_session)
        orchestration.unified_agent.handle = AsyncMock(return_value={
            "stage": "lead",
            "action": "book_demo",
            "meeting_date": "2026-08-28",
            "meeting_time": "04:00 PM",
            "timezone": "IST",
            "collect": {"name": "Bob Smith", "email": "bob@example.com", "phone": "+19876543210"}
        })

        payload = {
            "workspace_id": str(workspace_id),
            "conversation_id": str(conversation_id),
            "user_id": "test_user_bob",
            "message": "Let's do 4pm on Aug 28th",
            "from": "+19876543210",
            "calendar_enabled": True,
            "lead_fields": ["name", "email", "phone"]
        }

        with patch("app.services.email_automation.calender_executor.CalendarExecutor.execute") as mock_cal_exec:
            mock_cal_exec.return_value = {
                "status": "conflict",
                "conflict": True,
                "message": "The requested slot is already booked. Alternative slots: Monday at 10am",
                "alternative_slots": [{"display": "Monday, Aug 31 at 10:00 AM IST"}]
            }

            resp = await orchestration._process_message_internal_core(
                payload=payload,
                channel="whatsapp",
                skip_send=True,
                db=db_session
            )

            assert "already booked" in resp["text"]
            # Escalate and close should be False so user can choose an open slot
            assert resp["metadata"]["escalate"] is False
            assert resp["metadata"]["close"] is False
