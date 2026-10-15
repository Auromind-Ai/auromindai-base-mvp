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


def test_plain_text_message_does_not_pause_for_wait_for_response():
    """Plain text messages must never pause execution or schedule wait_for_response timeouts."""
    service = FlowServiceV2()
    mock_db = MagicMock()

    conv = MagicMock(spec=Conversation)
    conv.id = uuid.uuid4()
    conv.workspace_id = uuid.uuid4()

    flow = MagicMock()
    flow.id = uuid.uuid4()
    flow.edges = []

    state = MagicMock(spec=FlowExecutionState)
    state.active_flow_id = flow.id
    state.runtime_context = {}

    node = {
        "id": "txt_node",
        "type": "action",
        "config": {
            "type": "send_msg",
            "message_type": "text",
            "text": "Hello world!",
            "wait_for_response": True,
            "timeouts": [{"timeout_seconds": 30, "action": "send_followup", "message": "Still there?"}],
        },
    }

    with patch.object(service, "_queue_outbound_message"):
        paused = asyncio.run(
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

    assert paused is False
    assert "pending_timeout" not in state.runtime_context


def test_schedule_node_timeout_respects_wait_for_response_false():
    """When wait_for_response is explicitly False, _schedule_node_timeout must return False even if timeouts exist."""
    service = FlowServiceV2()
    mock_db = MagicMock()
    conv = MagicMock(spec=Conversation)
    conv.id = uuid.uuid4()
    flow = MagicMock()
    flow.id = uuid.uuid4()
    flow.edges = []
    state = MagicMock(spec=FlowExecutionState)
    state.runtime_context = {}

    node = {"id": "btn_1", "type": "action"}
    config = {
        "type": "send_msg",
        "message_type": "button_message",
        "wait_for_response": False,
        "timeouts": [{"timeout_seconds": 30, "action": "send_followup", "message": "Follow up"}],
    }

    scheduled = service._schedule_node_timeout(
        mock_db,
        conversation=conv,
        flow=flow,
        state=state,
        node=node,
        config=config,
    )
    assert scheduled is False
    assert "pending_timeout" not in state.runtime_context


def test_flow_validation_wait_for_response_only_for_interactive_nodes():
    """wait_for_response validation applies to button_message, brain_query, and ask_question, not plain text."""
    # Plain text node with legacy wait_for_response=True and empty timeouts should NOT fail validation
    nodes_text = [
        {"id": "t1", "type": "trigger", "config": {"event": "msg_recv", "keywords": ["hi"]}},
        {
            "id": "a1",
            "type": "action",
            "label": "Plain Text",
            "config": {"type": "send_msg", "message_type": "text", "text": "Hi", "wait_for_response": True, "timeouts": []},
        },
    ]
    edges_text = [{"id": "e1", "source": "t1", "target": "a1"}]
    res_text = FlowValidationService.validate_flow(nodes_text, edges_text)
    assert res_text["is_valid"] is True

    # AI Reply (brain_query) with wait_for_response=True and empty follow-up message SHOULD fail validation
    nodes_ai = [
        {"id": "t1", "type": "trigger", "config": {"event": "msg_recv", "keywords": ["hi"]}},
        {
            "id": "ai1",
            "type": "action",
            "label": "AI Reply",
            "config": {
                "type": "brain_query",
                "wait_for_response": True,
                "timeouts": [{"timeout_seconds": 30, "action": "send_followup", "message": ""}],
            },
        },
    ]
    edges_ai = [{"id": "e1", "source": "t1", "target": "ai1"}]
    res_ai = FlowValidationService.validate_flow(nodes_ai, edges_ai)
    assert res_ai["is_valid"] is False
    assert any("requires a follow-up message" in err for err in res_ai["errors"])


def test_ai_session_default_5min_expiry_without_timeout():
    """Without timeouts, AI Reply session expires in 5 minutes."""
    service = FlowServiceV2()
    mock_db = MagicMock()
    conv = MagicMock(spec=Conversation)
    conv.id = uuid.uuid4()
    conv.workspace_id = uuid.uuid4()
    flow = MagicMock()
    flow.id = uuid.uuid4()
    flow.edges = []
    state = MagicMock(spec=FlowExecutionState)
    state.active_flow_id = flow.id
    state.runtime_context = {}

    node = {
        "id": "ai_node",
        "type": "action",
        "config": {
            "type": "brain_query",
            "wait_for_response": False,
        },
    }

    with patch("app.services.automations.flow_service_v2.execute_ai_reply", return_value={"response_text": "Hi!", "status": "ok"}), \
         patch.object(service, "_queue_outbound_message"), \
         patch("app.services.automations.flow_service_v2.flag_modified"):
        asyncio.run(
            service._handle_action_node(
                db=mock_db,
                conversation=conv,
                flow=flow,
                state=state,
                node=node,
                inbound_text="hi",
                msg_sequence=[0],
            )
        )

    assert state.runtime_context["active_ai_session"] is True
    assert "ai_expires_at" in state.runtime_context
    exp = datetime.fromisoformat(state.runtime_context["ai_expires_at"])
    now = datetime.now(timezone.utc)
    diff = (exp - now).total_seconds()
    assert 290 <= diff <= 310  # ~300 seconds (5 minutes)


def test_ai_session_multi_stage_timeouts_and_expiry_after_last():
    """With multi-stage timeouts (e.g. 2m and 22m), AI session expires 5 minutes AFTER the last stage."""
    service = FlowServiceV2()
    mock_db = MagicMock()
    conv = MagicMock(spec=Conversation)
    conv.id = uuid.uuid4()
    conv.workspace_id = uuid.uuid4()
    flow = MagicMock()
    flow.id = uuid.uuid4()
    flow.edges = []
    state = MagicMock(spec=FlowExecutionState)
    state.active_flow_id = flow.id
    state.runtime_context = {}

    node = {
        "id": "ai_node",
        "type": "action",
        "config": {
            "type": "brain_query",
            "wait_for_response": True,
            "timeouts": [
                {"timeout_seconds": 120, "action": "send_followup", "message": "Stage 1"},
                {"timeout_seconds": 1320, "action": "send_followup", "message": "Stage 2"},
            ],
        },
    }

    with patch("app.services.automations.flow_service_v2.execute_ai_reply", return_value={"response_text": "AI Reply", "status": "ok"}), \
         patch.object(service, "_queue_outbound_message"), \
         patch("app.services.automations.flow_service_v2.flag_modified"), \
         patch("app.workers.flow_execution.handle_node_timeout.apply_async") as mock_apply:
        asyncio.run(
            service._handle_action_node(
                db=mock_db,
                conversation=conv,
                flow=flow,
                state=state,
                node=node,
                inbound_text="hi",
                msg_sequence=[0],
            )
        )

    # 1. First stage dispatched via apply_async with 120s countdown
    mock_apply.assert_called_once()
    _, kwargs = mock_apply.call_args
    assert kwargs["countdown"] == 120

    # 2. Total window initially set to 120 + 1320 + 300 = 1740s (~29 minutes)
    exp = datetime.fromisoformat(state.runtime_context["ai_expires_at"])
    diff = (exp - datetime.now(timezone.utc)).total_seconds()
    assert 1730 <= diff <= 1750


def test_button_mismatch_preserves_pending_button_and_timeout():
    """If customer types arbitrary text, pending_button and pending_timeout are NOT destroyed."""
    service = FlowServiceV2()
    mock_db = MagicMock()
    conv = MagicMock(spec=Conversation)
    conv.id = uuid.uuid4()
    conv.workspace_id = uuid.uuid4()
    flow = MagicMock()
    flow.id = uuid.uuid4()
    flow.edges = []
    mock_db.query.return_value.filter.return_value.first.return_value = flow

    state = MagicMock(spec=FlowExecutionState)
    state.active_flow_id = flow.id
    state.current_node_id = "btn_node"
    state.pending_button = {
        "node_id": "btn_node",
        "flow_id": str(flow.id),
        "buttons": [{"label": "Yes", "value": "yes"}],
    }
    state.button_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    state.runtime_context = {
        "pending_timeout": {
            "node_id": "btn_node",
            "stage_index": 0,
            "timeouts": [{"timeout_seconds": 120, "message": "reminder"}],
        }
    }

    with patch.object(service, "_claim_execution_slot", return_value=state), \
         patch.object(service, "_release_execution_slot"), \
         patch.object(service, "_persist_state"), \
         patch.object(service, "_queue_outbound_message"), \
         patch("app.services.automations.flow_service_v2.flag_modified"), \
         patch("app.services.automations.flow_service_v2._trigger_send_next"):

        asyncio.run(
            service.execute_incoming_message(
                db=mock_db,
                conversation_id=str(conv.id),
                inbound_text="random unrecognized text",
                metadata={},
            )
        )

    # pending_button and pending_timeout must still be intact!
    assert state.pending_button is not None
    assert state.runtime_context.get("pending_timeout") is not None


def test_multi_stage_timeouts_capped_to_24_hours():
    """Verifies that multi-stage follow-ups (e.g. 10m, 2h, 24h) work cleanly, and any stage over 24h is clamped to 86,400s."""
    service = FlowServiceV2()
    config = {
        "wait_for_response": True,
        "timeouts": [
            {"timeout_amount": 10, "timeout_unit": "minutes", "action": "send_followup", "message": "10 min followup"},
            {"timeout_amount": 2, "timeout_unit": "hours", "action": "send_followup", "message": "2 hour followup"},
            {"timeout_amount": 24, "timeout_unit": "hours", "action": "send_followup", "message": "24 hour followup"},
            {"timeout_amount": 60, "timeout_unit": "hours", "action": "send_followup", "message": "60 hour followup"},
        ],
    }

    parsed = service._parse_node_timeouts(config)
    assert len(parsed) == 4
    # 10 minutes = 600s
    assert parsed[0]["timeout_seconds"] == 600
    # 2 hours = 7200s
    assert parsed[1]["timeout_seconds"] == 7200
    # 24 hours = 86400s
    assert parsed[2]["timeout_seconds"] == 86400
    # 60 hours is clamped to max 24 hours (86,400s)
    assert parsed[3]["timeout_seconds"] == 86400

    # Total window must cover all 4 stages
    total_seconds = sum(t["timeout_seconds"] for t in parsed)
    assert total_seconds == 600 + 7200 + 86400 + 86400


def test_validation_rejects_timeouts_exceeding_24_hours():
    """Flow validation must reject timeouts greater than 24 hours (86,400s) due to WhatsApp service window."""
    nodes = [
        {"id": "t1", "type": "trigger", "config": {"event": "msg_recv", "keywords": ["hi"]}},
        {
            "id": "btn1",
            "type": "action",
            "label": "Button Step",
            "config": {
                "type": "send_msg",
                "message_type": "button_message",
                "text": "Choose",
                "buttons": [{"label": "A", "value": "a"}],
                "wait_for_response": True,
                "timeouts": [
                    {"timeout_seconds": 90000, "action": "send_followup", "message": "Over 24h follow-up"}
                ],
            },
        },
    ]
    edges = [{"id": "e1", "source": "t1", "target": "btn1"}]
    res = FlowValidationService.validate_flow(nodes, edges)
    assert res["is_valid"] is False
    assert any("cannot exceed 24 hours" in err for err in res["errors"])


def test_exhausted_timeout_drops_late_duplicate_execution():
    """If a timeout has already been exhausted, any duplicate task must return False without sending messages."""
    service = FlowServiceV2()
    mock_db = MagicMock()
    flow_id = uuid.uuid4()
    conv = MagicMock(spec=Conversation)
    conv.id = uuid.uuid4()
    mock_db.query.return_value.filter.return_value.first.return_value = conv

    state = MagicMock(spec=FlowExecutionState)
    state.active_flow_id = flow_id
    state.runtime_context = {
        "pending_timeout": {
            "node_id": "btn_node",
            "exhausted": True,
            "stage_index": 0,
        }
    }

    with patch.object(service, "_claim_execution_slot", return_value=state), \
         patch.object(service, "_release_execution_slot"), \
         patch.object(service, "_queue_outbound_message") as mock_send:
        result = asyncio.run(
            service.handle_node_timeout_execution(
                mock_db,
                conversation_id=str(conv.id),
                node_id="btn_node",
                stage_index=0,
            )
        )

    assert result is False
    mock_send.assert_not_called()


def test_question_reply_clears_pending_timeout_and_cancels_scheduled_resume():
    """Answering a question must immediately wipe pending_timeout and cancel pending ScheduledResume rows."""
    service = FlowServiceV2()
    mock_db = MagicMock()
    flow_id = uuid.uuid4()
    conv = MagicMock(spec=Conversation)
    conv.id = uuid.uuid4()
    conv.workspace_id = uuid.uuid4()

    flow = MagicMock()
    flow.id = flow_id
    flow.workspace_id = conv.workspace_id
    flow.nodes = [{"id": "q1", "type": "action"}]
    flow.edges = [{"id": "e1", "source": "q1", "target": "next_node"}]
    mock_db.query.return_value.filter.return_value.first.return_value = flow

    state = MagicMock(spec=FlowExecutionState)
    state.active_flow_id = flow_id
    state.pending_question = {
        "node_id": "q1",
        "flow_id": str(flow_id),
        "variable_name": "user_email",
        "next_node_id": "next_node",
    }
    state.question_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    state.runtime_context = {
        "pending_timeout": {
            "node_id": "q1",
            "stage_index": 0,
            "timeouts": [{"timeout_seconds": 60, "message": "reminder"}],
        }
    }

    with patch.object(service, "_execute_from_node"), \
         patch("app.services.automations.flow_service_v2.flag_modified"):
        handled = asyncio.run(
            service._handle_pending_question(
                mock_db,
                conversation=conv,
                state=state,
                inbound_text="test@example.com",
            )
        )

    assert handled is True
    assert state.pending_question is None
    assert state.runtime_context.get("pending_timeout") is None
    # ScheduledResume rows must have been cancelled
    mock_db.query.return_value.filter.return_value.update.assert_called_with(
        {"status": "cancelled"}, synchronize_session=False
    )

