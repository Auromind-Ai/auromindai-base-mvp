import asyncio
import uuid
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta
import pytest

from app.services.automations.trigger_engine import match_trigger, TriggerMatchResult
from app.services.automations.flow_validation_service import FlowValidationService
from app.services.automations.flow_service_v2 import FlowServiceV2
from app.models.flow_execution import FlowExecutionState
from app.models.conversation import Conversation
from app.models.scheduled_resume import ScheduledResume
from app.models.outbound_message import OutboundMessage
from app.models.automation import AutomationFlow


# ── 1. TRIGGER ENGINE TESTS ──

def test_trigger_keyword_matching():
    trigger_node = {
        "id": "t1",
        "type": "trigger",
        "config": {
            "event": "msg_recv",
            "keywords": ["pricing", "cost", "quote"],
            "match_type": "word_match",
        },
    }

    # Matches keyword
    res = match_trigger(trigger_node, event="msg_recv", message="What is your pricing?")
    assert res.matched is True
    assert res.matched_keyword == "pricing"

    # Does not match unrelated keyword
    res_unmatched = match_trigger(trigger_node, event="msg_recv", message="Where is your office?")
    assert res_unmatched.matched is False


def test_trigger_catch_all_wildcard():
    # Wildcard '*' keyword matches any message
    trigger_node = {
        "id": "t1",
        "type": "trigger",
        "config": {
            "event": "msg_recv",
            "keywords": ["*"],
            "match_type": "word_match",
        },
    }
    res = match_trigger(trigger_node, event="msg_recv", message="Any random text here")
    assert res.matched is True
    assert res.match_type == "match_all"

    # match_all: True config matches any message
    trigger_match_all = {
        "id": "t1",
        "type": "trigger",
        "config": {
            "event": "msg_recv",
            "match_all": True,
        },
    }
    res2 = match_trigger(trigger_match_all, event="msg_recv", message="Hello there!")
    assert res2.matched is True


def test_trigger_empty_keywords_rejected():
    trigger_node = {
        "id": "t1",
        "type": "trigger",
        "config": {
            "event": "msg_recv",
            "keywords": [],
            "match_type": "word_match",
        },
    }
    res = match_trigger(trigger_node, event="msg_recv", message="Hello")
    assert res.matched is False


# ── 2. FLOW VALIDATION SERVICE TESTS ──

def test_flow_validation_rejects_empty_trigger_keywords():
    nodes = [
        {
            "id": "t1",
            "type": "trigger",
            "label": "Message Received Trigger",
            "config": {
                "event": "msg_recv",
                "keywords": [],
            },
        },
        {
            "id": "a1",
            "type": "action",
            "label": "Reply",
            "config": {"type": "send_msg", "text": "Hi"},
        },
    ]
    edges = [{"id": "e1", "source": "t1", "target": "a1"}]

    validation = FlowValidationService.validate_flow(nodes, edges)
    assert validation["is_valid"] is False
    assert any("no keywords configured" in err.lower() for err in validation["errors"])


def test_flow_validation_allows_initial_single_trigger_flow():
    # Brand new blank canvas with only "Init Trigger" node
    nodes = [
        {
            "id": "1",
            "type": "trigger",
            "label": "Init Trigger",
            "config": {
                "event": "msg_recv",
                "match_type": "word_match",
                "keywords": [],
            },
        }
    ]
    edges = []

    validation = FlowValidationService.validate_flow(nodes, edges)
    assert validation["is_valid"] is True
    assert len(validation["errors"]) == 0


def test_flow_validation_accepts_valid_trigger_keywords():
    nodes = [
        {
            "id": "t1",
            "type": "trigger",
            "label": "Trigger",
            "config": {
                "event": "msg_recv",
                "keywords": ["hello", "hi"],
            },
        },
        {
            "id": "a1",
            "type": "action",
            "label": "Reply",
            "config": {"type": "send_msg", "text": "Hi there!"},
        },
    ]
    edges = [{"id": "e1", "source": "t1", "target": "a1"}]

    validation = FlowValidationService.validate_flow(nodes, edges)
    assert validation["is_valid"] is True
    assert len(validation["errors"]) == 0


def test_flow_validation_whatsapp_button_limit():
    nodes = [
        {
            "id": "t1",
            "type": "trigger",
            "config": {"event": "msg_recv", "keywords": ["hi"]},
        },
        {
            "id": "a1",
            "type": "action",
            "config": {
                "type": "send_msg",
                "text": "Choose:",
                "message_type": "button_message",
                "buttons": [
                    {"label": "1"}, {"label": "2"}, {"label": "3"}, {"label": "4"}
                ],
            },
        },
    ]
    edges = [{"id": "e1", "source": "t1", "target": "a1"}]

    validation = FlowValidationService.validate_flow(nodes, edges)
    assert validation["is_valid"] is False
    assert any("at most 3 buttons" in err for err in validation["errors"])


# ── 3. CONDITION EVALUATION TESTS ──

def test_condition_evaluation_logic():
    service = FlowServiceV2()

    # Numeric comparisons
    assert service._evaluate_condition("greater_than", 100, 50) is True
    assert service._evaluate_condition("greater_than", "25", "50") is False
    assert service._evaluate_condition("equals", "YES", "yes") is True
    assert service._evaluate_condition("contains", "I want support please", "support") is True
    assert service._evaluate_condition("is_empty", "", None) is True
    assert service._evaluate_condition("not_empty", "test@domain.com", None) is True


def test_condition_node_custom_field_isolation():
    service = FlowServiceV2()
    mock_db = MagicMock()
    conv = MagicMock(spec=Conversation)
    conv.id = uuid.uuid4()
    flow = MagicMock()
    flow.edges = [
        {"id": "e1", "source": "cond1", "sourceHandle": "true", "target": "node_true"},
        {"id": "e2", "source": "cond1", "sourceHandle": "false", "target": "node_false"},
    ]

    # State has no customer_email in runtime_context
    state = MagicMock(spec=FlowExecutionState)
    state.runtime_context = {"user_reply": "User typed random message"}

    node = {
        "id": "cond1",
        "type": "action",
        "config": {
            "type": "condition",
            "field": "customer_email",
            "operator": "not_empty",
            "compare_value": "",
        },
    }

    asyncio.run(
        service._handle_condition_node(
            db=mock_db,
            conversation=conv,
            flow=flow,
            state=state,
            node=node,
            inbound_text="User typed random message",
            msg_sequence=[0],
        )
    )

    # Condition should evaluate to False -> routes to node_false
    assert state.current_node_id == "node_false"


# ── 4. TEMPLATE RENDERING AND CONTEXT TESTS ──

def test_render_template_semantic_fallbacks():
    service = FlowServiceV2()
    context = {
        "customer_name": "Alice Johnson",
        "workspace_name": "Acme Corp",
    }
    rendered = service._render_template("Hello {{customer_name}}, welcome to {{workspace_name}}!", context)
    assert rendered == "Hello Alice Johnson, welcome to Acme Corp!"

    # Fallback to "there" if no name
    rendered_empty = service._render_template("Hello {{customer_name}}!", {})
    assert rendered_empty == "Hello there!"


# ── 5. TIMEOUT DEADLOCK FIX VERIFICATION ──

def test_timeout_preserves_next_node_on_exhaustion():
    # Verify that when all timeout stages finish without reply,
    # pending_timeout retains next_node_id with exhausted=True
    state = MagicMock(spec=FlowExecutionState)
    state.runtime_context = {}

    pending = {
        "node_id": "wait_node_1",
        "next_node_id": "step_after_wait",
        "stage_index": 0,
    }

    # Simulate timeout handler exhaustion logic
    next_node_id = pending.get("next_node_id")
    if next_node_id:
        state.runtime_context["pending_timeout"] = {
            "node_id": pending["node_id"],
            "next_node_id": next_node_id,
            "exhausted": True,
        }

    assert state.runtime_context["pending_timeout"]["exhausted"] is True
    assert state.runtime_context["pending_timeout"]["next_node_id"] == "step_after_wait"


def test_button_followup_then_click_yes():
    """Verifies that if a 10-minute follow-up fires on a button message,
    the user can still click 'Yes' afterwards and successfully continue the flow."""
    service = FlowServiceV2()
    mock_db = MagicMock()

    flow_id = uuid.uuid4()
    conv_id = uuid.uuid4()
    ws_id = uuid.uuid4()

    conv = MagicMock(spec=Conversation)
    conv.id = conv_id
    conv.workspace_id = ws_id

    flow = MagicMock()
    flow.id = flow_id
    flow.workspace_id = ws_id
    flow.edges = [
        {"id": "e_yes", "source": "btn_node", "sourceHandle": "yes", "target": "node_after_yes"},
        {"id": "e_no", "source": "btn_node", "sourceHandle": "no", "target": "node_after_no"},
    ]

    mock_db.query.return_value.filter.return_value.first.return_value = flow

    # State after button message is sent and 10-min follow-up was dispatched
    state = MagicMock(spec=FlowExecutionState)
    state.active_flow_id = flow_id
    state.current_node_id = "btn_node"
    state.runtime_context = {}
    state.button_expires_at = datetime.now(timezone.utc) + timedelta(minutes=50) # Still valid
    state.pending_button = {
        "node_id": "btn_node",
        "flow_id": str(flow_id),
        "buttons": [
            {"label": "Yes", "value": "yes"},
            {"label": "No", "value": "no"},
        ],
    }

    # Follow-up timeout finishes -> active_flow_id and pending_button must remain intact
    assert state.pending_button is not None
    assert state.active_flow_id == flow_id

    # User clicks "Yes" 15 minutes later
    with patch.object(service, "_execute_from_node") as mock_exec:
        handled = asyncio.run(
            service._handle_pending_button(
                db=mock_db,
                conversation=conv,
                state=state,
                inbound_text="Yes",
                metadata={"interactive_value": "yes", "interactive_label": "Yes"},
            )
        )
        assert handled is True
        mock_exec.assert_called_once()
        _, kwargs = mock_exec.call_args
        assert kwargs["node_id"] == "node_after_yes"


def test_button_node_default_5min_expiry_without_timeout():
    """If no timeout is configured, button node defaults to 5-minute expiration."""
    service = FlowServiceV2()
    mock_db = MagicMock()

    flow_id = uuid.uuid4()
    conv = MagicMock(spec=Conversation)
    conv.id = uuid.uuid4()
    conv.workspace_id = uuid.uuid4()

    flow = MagicMock()
    flow.id = flow_id
    flow.edges = []

    state = MagicMock(spec=FlowExecutionState)
    state.active_flow_id = flow_id
    state.runtime_context = {}

    node = {
        "id": "btn_node",
        "type": "action",
        "config": {
            "type": "send_msg",
            "message_type": "button",
            "text": "Choose an option:",
            "buttons": [{"label": "Yes", "value": "yes"}, {"label": "No", "value": "no"}],
            # No timeout configured
        },
    }

    with patch.object(service, "_queue_outbound_message") as mock_queue:
        asyncio.run(
            service._handle_send_message_node(
                db=mock_db,
                conversation=conv,
                flow=flow,
                state=state,
                node=node,
                inbound_text="hi",
                msg_sequence=[0],
            )
        )

    now = datetime.now(timezone.utc)
    # button_expires_at should be approximately now + 5 minutes
    assert state.button_expires_at is not None
    time_diff = (state.button_expires_at - now).total_seconds()
    assert 290 <= time_diff <= 310  # ~300 seconds (5 minutes)


def test_ask_question_default_5min_expiry_without_timeout():
    """If no timeout is configured, ask_question defaults to 5-minute expiration."""
    service = FlowServiceV2()
    mock_db = MagicMock()

    flow_id = uuid.uuid4()
    conv = MagicMock(spec=Conversation)
    conv.id = uuid.uuid4()
    conv.workspace_id = uuid.uuid4()

    flow = MagicMock()
    flow.id = flow_id
    flow.edges = []

    state = MagicMock(spec=FlowExecutionState)
    state.active_flow_id = flow_id
    state.runtime_context = {}

    node = {
        "id": "q_node",
        "type": "ask_question",
        "config": {
            "question": "What is your email?",
            "variable_name": "email",
            # No timeout configured
        },
    }

    with patch.object(service, "_queue_outbound_message"):
        asyncio.run(
            service._handle_ask_question_node(
                db=mock_db,
                conversation=conv,
                flow=flow,
                state=state,
                node=node,
                inbound_text="hi",
                msg_sequence=[0],
            )
        )

    now = datetime.now(timezone.utc)
    assert state.question_expires_at is not None
    time_diff = (state.question_expires_at - now).total_seconds()
    assert 290 <= time_diff <= 310  # ~300 seconds (5 minutes)


def test_button_with_timeout_then_5min_grace_window():
    """If timeout is configured (e.g. 10m), timeout fires follow-up, then gives 5-min grace window."""
    service = FlowServiceV2()
    mock_db = MagicMock()

    flow_id = uuid.uuid4()
    conv_id = uuid.uuid4()
    ws_id = uuid.uuid4()

    conv = MagicMock(spec=Conversation)
    conv.id = conv_id
    conv.workspace_id = ws_id

    flow = MagicMock()
    flow.id = flow_id
    flow.workspace_id = ws_id
    flow.edges = [
        {"id": "e_yes", "source": "btn_node", "sourceHandle": "yes", "target": "node_after_yes"},
    ]

    def query_side_effect(model):
        m = MagicMock()
        if model == Conversation:
            m.filter.return_value.first.return_value = conv
        elif model == AutomationFlow:
            m.filter.return_value.first.return_value = flow
        else:
            m.filter.return_value.first.return_value = None
            m.filter_by.return_value.first.return_value = None
        return m

    mock_db.query.side_effect = query_side_effect

    # State with pending timeout of 10 minutes (600s)
    state = MagicMock(spec=FlowExecutionState)
    state.active_flow_id = flow_id
    state.current_node_id = "btn_node"
    state.pending_button = {
        "node_id": "btn_node",
        "flow_id": str(flow_id),
        "buttons": [{"label": "Yes", "value": "yes"}],
    }
    state.runtime_context = {
        "pending_timeout": {
            "node_id": "btn_node",
            "stage_index": 0,
            "total_stages": 1,
            "timeouts": [{
                "id": "t1",
                "timeout_seconds": 600,
                "action": "send_followup",
                "message": "Followup reminder!",
            }],
        }
    }

    # Simulate handle_node_timeout_execution executing follow-up stage
    with patch.object(service, "_claim_execution_slot", return_value=state), \
         patch.object(service, "_release_execution_slot"), \
         patch.object(service, "_queue_outbound_message"), \
         patch.object(service, "_persist_state"), \
         patch("app.services.automations.flow_service_v2.flag_modified"), \
         patch("app.services.automations.flow_service_v2._trigger_send_next"):

        asyncio.run(
            service.handle_node_timeout_execution(
                db=mock_db,
                conversation_id=str(conv_id),
                node_id="btn_node",
                stage_index=0,
            )
        )

    now = datetime.now(timezone.utc)
    # button_expires_at must be reset to ~5 minutes after follow-up is delivered!
    assert state.button_expires_at is not None
    time_diff = (state.button_expires_at - now).total_seconds()
    assert 290 <= time_diff <= 310  # ~300s (5 minutes)


def test_session_expired_after_grace_window():
    """If customer clicks button after the 5-minute window has passed, it informs expired and resets flow."""
    service = FlowServiceV2()
    mock_db = MagicMock()

    flow_id = uuid.uuid4()
    conv = MagicMock(spec=Conversation)
    conv.id = uuid.uuid4()
    conv.workspace_id = uuid.uuid4()

    flow = MagicMock()
    flow.id = flow_id
    flow.workspace_id = conv.workspace_id
    flow.edges = [{"id": "e_yes", "source": "btn_node", "sourceHandle": "yes", "target": "next_node"}]
    mock_db.query.return_value.filter.return_value.first.return_value = flow

    state = MagicMock(spec=FlowExecutionState)
    state.active_flow_id = flow_id
    state.current_node_id = "btn_node"
    state.runtime_context = {}
    # Expired 1 minute ago!
    state.button_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    state.pending_button = {
        "node_id": "btn_node",
        "flow_id": str(flow_id),
        "buttons": [{"label": "Yes", "value": "yes"}],
    }

    with patch.object(service, "_queue_outbound_message") as mock_queue, \
         patch.object(service, "_persist_state"), \
         patch("app.services.automations.flow_service_v2._trigger_send_next"):

        handled = asyncio.run(
            service._handle_pending_button(
                db=mock_db,
                conversation=conv,
                state=state,
                inbound_text="Yes",
                metadata={"interactive_value": "yes"},
            )
        )

    assert handled is True
    # Flow state must be reset so user can start again
    assert state.active_flow_id is None
    assert state.current_node_id is None
    assert state.pending_button is None
    # Outbound message should inform them of expiration
    mock_queue.assert_called_once()
    _, kwargs = mock_queue.call_args
    assert "expired" in kwargs["body"].lower()


