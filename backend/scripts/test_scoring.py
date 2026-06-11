import sys
import os
from uuid import UUID

# Insert import path at the BEGINNING of sys.path to avoid global conflicts
sys.path.insert(0, "c:/Users/Auromindai/Documents/auromindai-base-mvp/backend")

# Set DATABASE_URL to use db if in container, otherwise localhost
if os.path.exists("/.dockerenv") or os.environ.get("HOSTNAME", "").startswith("auromind_"):
    os.environ["DATABASE_URL"] = "postgresql+psycopg2://postgres:Arunjack007%40@db:5432/auromindai"
else:
    os.environ["DATABASE_URL"] = "postgresql+psycopg2://postgres:Arunjack007%40@localhost:5432/auromindai"

from app.services.crm.lead_scoring_service import calculate_score, calculate_score_breakdown
from app.database import SessionLocal
from app.models.ai_action import Lead

def test_stateless_scoring():
    print("=== Testing stateless calculate_score ===")
    
    # Base inputs:
    # progress: 2/10 nodes -> 4
    # recency: days_inactive 0 -> 20
    # engagement: positive responses (replied) -> 10
    # intent: 10
    # total natural score = 4 + 20 + 10 + 10 = 44
    
    # 1. No labels
    score, behavioral, intent, bonus, tier = calculate_score(
        current_node=2,
        total_nodes=10,
        days_inactive=0,
        template_responses=["replied"],
        semantic_intent_score=10,
        active_labels=None
    )
    print(f"No labels -> Score: {score}, Behavioral: {behavioral}, Intent: {intent}, Bonus: {bonus}, Tier: {tier}")
    assert score == 44
    assert behavioral == 34
    assert intent == 10
    assert bonus == 0
    assert tier == "warm"
    
    # 2. Add Interested label (+10)
    score, behavioral, intent, bonus, tier = calculate_score(
        current_node=2,
        total_nodes=10,
        days_inactive=0,
        template_responses=["replied"],
        semantic_intent_score=10,
        active_labels=["Interested"]
    )
    print(f"Interested (+10) -> Score: {score}, Behavioral: {behavioral}, Intent: {intent}, Bonus: {bonus}, Tier: {tier}")
    assert score == 54
    assert bonus == 10
    assert tier == "warm"
    
    # 3. Add High Priority (+15) and Premium Lead (+20)
    score, behavioral, intent, bonus, tier = calculate_score(
        current_node=2,
        total_nodes=10,
        days_inactive=0,
        template_responses=["replied"],
        semantic_intent_score=10,
        active_labels=["High Priority", "Premium Lead"]
    )
    print(f"High Priority (+15) + Premium Lead (+20) -> Score: {score}, Behavioral: {behavioral}, Intent: {intent}, Bonus: {bonus}, Tier: {tier}")
    # 44 + 35 = 79
    assert score == 79
    assert bonus == 35
    assert tier == "hot"  # 79 >= 75 is Hot
    
    # 4. Check cap of 100 using higher base score
    score, behavioral, intent, bonus, tier = calculate_score(
        current_node=8,
        total_nodes=10,
        days_inactive=0,
        template_responses=["replied", "clicked"],
        semantic_intent_score=30,
        active_labels=["High Priority", "Premium Lead", "Interested", "Follow Up"]
    )
    # progress = 16, recency = 20, engagement = 20 -> behavioral = 56
    # intent = 30 -> natural = 86
    # labels = 15 + 20 + 10 + 5 = 50
    # total = 86 + 50 = 136 -> Capped at 100
    print(f"All labels (Capped 100) -> Score: {score}, Behavioral: {behavioral}, Intent: {intent}, Bonus: {bonus}, Tier: {tier}")
    assert score == 100
    assert bonus == 50
    assert tier == "hot"

    print("Stateless scoring tests PASSED!\n")

def test_db_score_recalculation():
    print("=== Testing Database Lead Score Recalculation ===")
    db = SessionLocal()
    try:
        # Let's find an existing lead
        lead = db.query(Lead).first()
        if not lead:
            print("No leads in DB to test DB recalculation.")
            return
            
        print(f"Testing with Lead: {lead.name} (ID: {lead.id})")
        print(f"Current Labels: {lead.labels}")
        print(f"Current Score: {lead.score}, Current Tier: {lead.lead_tier}")
        
        # Save original values
        orig_labels = lead.labels
        
        # Set new labels
        lead.labels = ["High Priority", "Follow Up"]
        db.commit()
        
        # Perform recalculation
        from app.services.crm.lead_scoring_service import recalculate_lead_score
        breakdown = recalculate_lead_score(lead, db, reason="test_recalculation", commit=True)
        
        print(f"Recalculated Score: {lead.score}, Tier: {lead.lead_tier}")
        print(f"Breakdown: {breakdown}")
        
        # Expected bonus is 15 + 5 = 20
        assert lead.labels == ["High Priority", "Follow Up"]
        assert breakdown["agent_label_bonus"] == 20
        assert lead.score == breakdown["total"]
        assert lead.lead_tier == breakdown["lead_tier"]
        
        # Restore original labels
        lead.labels = orig_labels
        recalculate_lead_score(lead, db, reason="restore", commit=True)
        print("DB Recalculation tests PASSED!\n")
    finally:
        db.close()

if __name__ == "__main__":
    test_stateless_scoring()
    test_db_score_recalculation()
    print("All tests completed successfully!")
