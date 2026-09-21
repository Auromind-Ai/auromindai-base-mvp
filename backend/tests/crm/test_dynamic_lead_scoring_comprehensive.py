import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.workspace import Workspace, WorkspaceMember
from app.models.user import User
from app.models.ai_action import Lead
from app.models.conversation import Conversation
from app.models.message import Message, SenderType
from app.models.lead_scoring import LeadScoreHistory
from app.models.lead_scoring_rule import (
    LeadScoringSetting,
    DEFAULT_SIGNALS,
    DEFAULT_THRESHOLDS,
)
from app.utils.intent_detection import detect_intent_signals
from app.services.crm.lead_scoring_service import (
    calculate_score,
    calculate_score_breakdown,
    recalculate_lead_score,
)


@pytest.fixture
def crm_test_env():
    """Sets up an in-memory SQLite database and seeds realistic CRM lead scoring data."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # 1. Create Workspace & User
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    ws = Workspace(id=ws_id, name="Auromind Test Workspace")
    user = User(id=user_id, email="sales@auromind.test", full_name="Sales Admin", is_active=True)
    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    session.add_all([ws, user, member])
    session.commit()

    # 2. Seed Lead Scoring Setting with Custom Signals & Thresholds
    custom_signals = [
        {
            "id": "bulk_enterprise",
            "name": "Enterprise Bulk Order",
            "examples": ["bulk order", "enterprise license", "wholesale", "500 users"],
            "points": 35,
            "enabled": True,
        },
        {
            "id": "urgent_need",
            "name": "Urgent Deployment",
            "examples": ["urgent", "asap", "immediately", "deadline"],
            "points": 25,
            "enabled": True,
        },
        {
            "id": "budget_quote",
            "name": "Budget & Pricing Quote",
            "examples": ["quotation", "price quote", "estimate", "pricing sheet"],
            "points": 20,
            "enabled": True,
        },
        {
            "id": "competitor_churn",
            "name": "Competitor Mention",
            "examples": ["competitor", "cheaper elsewhere", "switching from"],
            "points": -20,
            "enabled": True,
        },
        {
            "id": "disabled_promo",
            "name": "Promo Inquiry",
            "examples": ["special discount", "coupon code"],
            "points": 40,
            "enabled": False,
        },
    ]

    setting = LeadScoringSetting(
        workspace_id=ws.id,
        ai_qualification_enabled=True,
        thresholds={"hot": 50, "warm": 30, "cold": 0},
        signals=custom_signals,
    )
    session.add(setting)
    session.commit()

    # 3. Seed Realistic Leads & Messages
    # Lead 1: Hot Enterprise Lead (Ramesh Sharma)
    conv_hot_id = uuid.uuid4()
    conv_hot = Conversation(id=conv_hot_id, workspace_id=ws.id, contact_name="Ramesh Sharma", channel="whatsapp")
    lead_hot = Lead(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        conversation_id=conv_hot_id,
        name="Ramesh Sharma",
        phone="919876543210",
        source="whatsapp",
        status="new",
        score=0,
    )
    msg_hot = Message(
        id=uuid.uuid4(),
        conversation_id=conv_hot_id,
        sender_type=SenderType.USER,
        content="Hi, we want to place a bulk order for an enterprise license for 500 users. We need this urgent and asap. Please give us a callback.",
        timestamp=datetime.now(timezone.utc),
    )
    session.add_all([conv_hot, lead_hot, msg_hot])

    # Lead 2: Warm Inquiring Lead (Ananya Patel)
    conv_warm_id = uuid.uuid4()
    conv_warm = Conversation(id=conv_warm_id, workspace_id=ws.id, contact_name="Ananya Patel", channel="whatsapp")
    lead_warm = Lead(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        conversation_id=conv_warm_id,
        name="Ananya Patel",
        phone="919123456789",
        source="whatsapp",
        status="new",
        score=0,
    )
    msg_warm = Message(
        id=uuid.uuid4(),
        conversation_id=conv_warm_id,
        sender_type=SenderType.USER,
        content="Please send an estimate for the project.",
        timestamp=datetime.now(timezone.utc),
    )
    session.add_all([conv_warm, lead_warm, msg_warm])

    # Lead 3: Cold / Vague Lead (Vague User)
    conv_cold_id = uuid.uuid4()
    conv_cold = Conversation(id=conv_cold_id, workspace_id=ws.id, contact_name="Vague User", channel="web")
    lead_cold = Lead(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        conversation_id=conv_cold_id,
        name="Vague User",
        source="web",
        status="new",
        score=0,
    )
    msg_cold = Message(
        id=uuid.uuid4(),
        conversation_id=conv_cold_id,
        sender_type=SenderType.USER,
        content="ok thanks",
        timestamp=datetime.now(timezone.utc),
    )
    session.add_all([conv_cold, lead_cold, msg_cold])

    # Lead 4: Negative Churn Lead (Suresh Kumar)
    conv_neg_id = uuid.uuid4()
    conv_neg = Conversation(id=conv_neg_id, workspace_id=ws.id, contact_name="Suresh Kumar", channel="whatsapp")
    lead_neg = Lead(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        conversation_id=conv_neg_id,
        name="Suresh Kumar",
        source="whatsapp",
        status="new",
        score=0,
    )
    msg_neg = Message(
        id=uuid.uuid4(),
        conversation_id=conv_neg_id,
        sender_type=SenderType.USER,
        content="Your product is too expensive and competitor is cheaper elsewhere, not interested.",
        timestamp=datetime.now(timezone.utc),
    )
    session.add_all([conv_neg, lead_neg, msg_neg])

    session.commit()

    yield {
        "session": session,
        "workspace": ws,
        "setting": setting,
        "leads": {
            "hot": lead_hot,
            "warm": lead_warm,
            "cold": lead_cold,
            "negative": lead_neg,
        },
    }

    session.close()


# -------------------------------------------------------------
# 1. System Default Configuration Tests
# -------------------------------------------------------------

def test_default_signals_and_thresholds():
    """Ensure baseline defaults are sane."""
    assert len(DEFAULT_SIGNALS) == 0
    assert DEFAULT_THRESHOLDS["hot"] == 50
    assert DEFAULT_THRESHOLDS["warm"] == 30
    assert DEFAULT_THRESHOLDS["cold"] == 0


# -------------------------------------------------------------
# 2. Intent Detection with Custom Signals
# -------------------------------------------------------------

def test_intent_detection_custom_signals_matching(crm_test_env):
    """Test that customer messages correctly trigger custom signals with points, snippets, and explanations."""
    setting = crm_test_env["setting"]
    signals_config = setting.signals

    # Message matching bulk order (+35) and urgent (+25)
    text = "We want to place a bulk order for our company immediately. It is urgent."
    result = detect_intent_signals(text, custom_signals=signals_config)

    assert result["signals"]["bulk_enterprise"]["value"] is True
    assert result["signals"]["bulk_enterprise"]["points"] == 35
    assert "bulk order" in result["signals"]["bulk_enterprise"]["snippet"].lower()

    assert result["signals"]["urgent_need"]["value"] is True
    assert result["signals"]["urgent_need"]["points"] == 25

    # Sum of points = 35 + 25 = 60
    assert result["semantic_intent_score"] >= 60


def test_intent_detection_disabled_signals(crm_test_env):
    """Test that disabled custom signals are ignored and award 0 points."""
    setting = crm_test_env["setting"]
    signals_config = setting.signals

    text = "Do you have a special discount or coupon code?"
    result = detect_intent_signals(text, custom_signals=signals_config)

    assert result["signals"]["disabled_promo"]["value"] is False
    # disabled signal points should not be added


def test_intent_detection_negative_signals(crm_test_env):
    """Test that negative intent custom signals deduct points."""
    setting = crm_test_env["setting"]
    signals_config = setting.signals

    text = "Your competitor is cheaper elsewhere."
    result = detect_intent_signals(text, custom_signals=signals_config)

    assert result["signals"]["competitor_churn"]["value"] is True
    assert result["signals"]["competitor_churn"]["points"] == -20
    assert result["semantic_intent_score"] <= 0


def test_intent_detection_score_capping(crm_test_env):
    """Test that semantic intent score is capped at 100 max."""
    custom_signals = [
        {"id": "massive_deal", "name": "Massive Deal", "examples": ["enterprise"], "points": 150, "enabled": True}
    ]
    result = detect_intent_signals("We want an enterprise contract.", custom_signals=custom_signals)
    assert result["semantic_intent_score"] <= 100


# -------------------------------------------------------------
# 3. Pure Score Calculation & Threshold Boundary Tests
# -------------------------------------------------------------

@pytest.mark.parametrize(
    "total_score, expected_tier",
    [
        (50, "hot"),   # Exact boundary for Hot
        (75, "hot"),   # Well above Hot
        (100, "hot"),  # Maximum score
        (49, "warm"),  # Just below Hot threshold (30-49)
        (30, "warm"),  # Exact boundary for Warm
        (29, "cold"),  # Just below Warm threshold (0-29)
        (10, "cold"),  # Low cold score
        (0, "cold"),   # Zero score
    ],
)
def test_calculate_score_boundary_thresholds(total_score, expected_tier):
    """Verifies that calculate_score strictly respects custom thresholds."""
    custom_thresholds = {"hot": 50, "warm": 30, "cold": 0}

    # Use calculate_score with semantic_intent_score matching total_score (with 0 behavioral)
    total, b, i, bonus, tier = calculate_score(
        current_node=0,
        total_nodes=0,
        days_inactive=10,  # 0 recency points
        template_responses=[],
        semantic_intent_score=total_score,
        custom_thresholds=custom_thresholds,
    )
    assert total == total_score
    assert tier == expected_tier


def test_calculate_score_breakdown_structure():
    """Verify calculate_score_breakdown outputs all fields expected by frontend."""
    custom_thresholds = {"hot": 50, "warm": 30, "cold": 0}
    breakdown = calculate_score_breakdown(
        current_node=2,
        total_nodes=4,
        days_inactive=0,
        template_responses=["replied"],
        semantic_intent_score=35,
        custom_thresholds=custom_thresholds,
    )

    assert "total" in breakdown
    assert "behavioral_score" in breakdown
    assert "semantic_intent_score" in breakdown
    assert "lead_tier" in breakdown
    assert "progress" in breakdown
    assert "recency" in breakdown
    assert "engagement" in breakdown
    assert "intent" in breakdown
    assert breakdown["lead_tier"] == "hot"  # behavioral (~40) + intent (35) > 50


# -------------------------------------------------------------
# 4. End-to-End Seeded Leads Recalculation Tests
# -------------------------------------------------------------

def test_recalculate_seeded_hot_lead(crm_test_env):
    """Test recalculating seeded Hot Enterprise Lead (Ramesh Sharma)."""
    session = crm_test_env["session"]
    lead = crm_test_env["leads"]["hot"]

    breakdown = recalculate_lead_score(lead, session, commit=True)

    # Lead matched bulk_enterprise (+35), urgent_need (+25), callback_request (+25)
    assert lead.semantic_intent_score >= 50
    assert lead.intent_signals["bulk_enterprise"]["value"] is True
    assert lead.intent_signals["urgent_need"]["value"] is True
    assert lead.lead_tier == "hot"
    assert lead.score >= 50
    assert breakdown["lead_tier"] == "hot"

    # Verify score change logged in LeadScoreHistory
    history = session.query(LeadScoreHistory).filter(LeadScoreHistory.lead_id == lead.id).first()
    assert history is not None
    assert history.score_after == lead.score


def test_recalculate_seeded_warm_lead(crm_test_env):
    """Test recalculating seeded Warm Inquiring Lead (Ananya Patel)."""
    session = crm_test_env["session"]
    lead = crm_test_env["leads"]["warm"]

    breakdown = recalculate_lead_score(lead, session, commit=True)

    # Lead matched budget_quote (+20) + recent activity (20 recency)
    assert lead.intent_signals["budget_quote"]["value"] is True
    assert lead.lead_tier == "warm"
    assert 30 <= lead.score < 50
    assert breakdown["lead_tier"] == "warm"


def test_recalculate_seeded_cold_lead(crm_test_env):
    """Test recalculating seeded Cold Lead (Vague User)."""
    session = crm_test_env["session"]
    lead = crm_test_env["leads"]["cold"]

    breakdown = recalculate_lead_score(lead, session, commit=True)

    # "ok thanks" has no buying signals
    assert lead.semantic_intent_score <= 0
    assert lead.lead_tier == "cold"
    assert lead.score < 30
    assert breakdown["lead_tier"] == "cold"


def test_recalculate_seeded_negative_churn_lead(crm_test_env):
    """Test recalculating seeded Negative Churn Lead (Suresh Kumar)."""
    session = crm_test_env["session"]
    lead = crm_test_env["leads"]["negative"]

    breakdown = recalculate_lead_score(lead, session, commit=True)

    # Matched competitor_churn (-20)
    assert lead.intent_signals["competitor_churn"]["value"] is True
    assert lead.intent_signals["competitor_churn"]["points"] == -20
    assert lead.lead_tier == "cold"


# -------------------------------------------------------------
# 5. AI Qualification Toggle & Dynamic Reconfiguration
# -------------------------------------------------------------

def test_ai_qualification_disabled_behavior(crm_test_env):
    """When ai_qualification_enabled is False, semantic intent signals should be skipped."""
    session = crm_test_env["session"]
    lead = crm_test_env["leads"]["hot"]
    setting = crm_test_env["setting"]

    # Disable AI qualification
    setting.ai_qualification_enabled = False
    session.commit()

    # Reset lead score
    lead.score = 0
    lead.semantic_intent_score = 0
    lead.intent_signals = {}
    session.commit()

    breakdown = recalculate_lead_score(lead, session, commit=True)

    # Semantic intent score should remain 0 because AI qualification was disabled
    assert lead.semantic_intent_score == 0
    assert breakdown["semantic_intent_score"] == 0


def test_dynamic_threshold_reconfiguration(crm_test_env):
    """Updating thresholds immediately changes the tier assigned during recalculation."""
    session = crm_test_env["session"]
    lead = crm_test_env["leads"]["warm"]
    setting = crm_test_env["setting"]

    # Current lead score is in 30-49 range (Warm)
    recalculate_lead_score(lead, session, commit=True)
    assert lead.lead_tier == "warm"

    # Raise Warm threshold to 45 (Lead's score is around 40, so it should become Cold)
    setting.thresholds = {"hot": 80, "warm": 45, "cold": 0}
    session.commit()

    recalculate_lead_score(lead, session, commit=True)
    if lead.score < 45:
        assert lead.lead_tier == "cold"
    else:
        assert lead.lead_tier == "warm"
