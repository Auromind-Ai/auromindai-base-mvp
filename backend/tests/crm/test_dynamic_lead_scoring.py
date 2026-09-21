import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.workspace import Workspace
from app.models.ai_action import Lead
from app.models.conversation import Conversation
from app.models.message import Message, SenderType
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
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Create test workspace
    ws = Workspace(
        id=uuid.uuid4(),
        name="Test Workspace",
    )
    session.add(ws)
    session.commit()

    yield session, ws

    session.close()


def test_default_signals_and_thresholds():
    assert len(DEFAULT_SIGNALS) == 0
    assert DEFAULT_THRESHOLDS["hot"] == 50
    assert DEFAULT_THRESHOLDS["warm"] == 30
    assert DEFAULT_THRESHOLDS["cold"] == 0



def test_detect_intent_signals_with_custom_signals():
    custom_signals = [
        {
            "id": "bulk_order",
            "name": "Bulk Order Inquiry",
            "examples": ["wholesale", "bulk order", "large quantity"],
            "points": 35,
            "enabled": True,
        },
        {
            "id": "competitor",
            "name": "Competitor Mention",
            "examples": ["competitor x", "cheaper elsewhere"],
            "points": -15,
            "enabled": True,
        },
        {
            "id": "disabled_signal",
            "name": "Disabled Signal",
            "examples": ["special discount"],
            "points": 50,
            "enabled": False,
        },
    ]

    # Message matching custom signal
    res1 = detect_intent_signals(
        "Hi, I want to place a bulk order for our company.",
        custom_signals=custom_signals,
    )
    assert res1["signals"]["bulk_order"]["value"] is True
    assert res1["signals"]["bulk_order"]["points"] == 35
    assert "bulk order" in res1["signals"]["bulk_order"]["snippet"]
    assert res1["semantic_intent_score"] == 35

    # Message matching negative custom signal
    res2 = detect_intent_signals(
        "Your product is good but competitor x is cheaper elsewhere.",
        custom_signals=custom_signals,
    )
    assert res2["signals"]["competitor"]["value"] is True
    assert res2["signals"]["competitor"]["points"] == -15
    assert res2["semantic_intent_score"] == -15

    # Message matching disabled signal should not trigger
    res3 = detect_intent_signals(
        "Can I get a special discount?",
        custom_signals=custom_signals,
    )
    assert res3["signals"]["disabled_signal"]["value"] is False
    # 5 points from default 'has_question' signal ("Can I..."), disabled custom signal adds 0
    assert res3["signals"]["has_question"]["value"] is True
    assert res3["semantic_intent_score"] == 5

    # Verify default signals are preserved alongside custom signals
    assert "has_pricing" in res1["signals"]
    assert "callback_request" in res1["signals"]


def test_custom_rules_score_capped_at_100():
    custom_signals = [
        {
            "id": "huge_deal",
            "name": "Huge Deal",
            "examples": ["million dollar contract"],
            "points": 150,
            "enabled": True,
        }
    ]
    res = detect_intent_signals(
        "We want to sign a million dollar contract today.",
        custom_signals=custom_signals,
    )
    assert res["signals"]["huge_deal"]["value"] is True
    # Default signals are also detected
    assert "has_urgency" in res["signals"]
    assert res["signals"]["has_urgency"]["value"] is True
    # Score capped at 100
    assert res["semantic_intent_score"] <= 100

    total, b, i, bonus, tier = calculate_score(
        current_node=4,
        total_nodes=4,
        days_inactive=0,
        template_responses=["replied"],
        semantic_intent_score=res["semantic_intent_score"],
    )
    assert total <= 100


def test_calculate_score_with_custom_thresholds():
    custom_thresholds = {"hot": 50, "warm": 30, "cold": 0}

    # Score of 55 should be "hot" under custom thresholds (normally >=75)
    total, b, i, bonus, tier = calculate_score(
        current_node=2,
        total_nodes=4,
        days_inactive=0,
        template_responses=["replied"],
        semantic_intent_score=25,
        custom_thresholds=custom_thresholds,
    )
    assert tier == "hot"
    assert total >= 50

    # Score of 35 should be "warm" under custom thresholds (normally >=40)
    total_warm, _, _, _, tier_warm = calculate_score(
        current_node=1,
        total_nodes=4,
        days_inactive=3,
        template_responses=[],
        semantic_intent_score=15,
        custom_thresholds=custom_thresholds,
    )
    assert tier_warm == "warm"


def test_recalculate_lead_score_with_custom_workspace_setting(db_session):
    session, ws = db_session

    # Create Lead Scoring Setting for workspace
    custom_signals = [
        {
            "id": "pricing",
            "name": "Asks about Pricing",
            "examples": ["price", "cost", "how much"],
            "points": 30,
            "enabled": True,
        },
        {
            "id": "custom_enterprise",
            "name": "Enterprise Plan",
            "examples": ["enterprise", "custom contract"],
            "points": 40,
            "enabled": True,
        },
    ]
    setting = LeadScoringSetting(
        workspace_id=ws.id,
        ai_qualification_enabled=True,
        thresholds={"hot": 50, "warm": 25, "cold": 0},
        signals=custom_signals,
    )
    session.add(setting)
    session.commit()

    # Create conversation and lead
    conv_id = uuid.uuid4()
    conv = Conversation(
        id=conv_id,
        workspace_id=ws.id,
        contact_name="Enterprise Customer",
    )
    session.add(conv)

    lead = Lead(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        conversation_id=conv_id,
        name="Enterprise Customer",
        status="new",
        score=0,
    )
    session.add(lead)

    # Add customer message asking about enterprise
    msg = Message(
        id=uuid.uuid4(),
        conversation_id=conv_id,
        sender_type=SenderType.USER,
        content="We need an enterprise plan with custom contract.",
    )
    session.add(msg)
    session.commit()

    # Recalculate lead score
    breakdown = recalculate_lead_score(lead, session, commit=True)

    # Lead should match enterprise (+40) and have hot tier (since >= 50 total)
    assert lead.semantic_intent_score == 40
    assert lead.intent_signals["custom_enterprise"]["value"] is True
    assert lead.lead_tier == "hot"
    assert breakdown["total"] >= 50
