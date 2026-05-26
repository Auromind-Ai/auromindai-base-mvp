import os
import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.workspace import Workspace
from app.models.subscription import Subscription
from app.models.usage import Usage
from app.models.plan import Plan
from app.services.billing.billing_service import enforce_execution_policy
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))
import uuid

def run_tests():
    db = SessionLocal()
    print("🚀 Starting Billing Enforcement Tests...\n")
    
    # We will just create dummy records in memory (rollback at the end)
    # to test the enforce_execution_policy helper
    
    try:
        # Create a dummy plan
        plan = Plan(
            id=uuid.uuid4(),
            name="test_pro",
            price=1000,
            token_limit=10, # Very low limit
            price_per_extra_token=1,
            billing_cycle="monthly",
            currency="INR"
        )
        db.add(plan)
        
        # Create Workspaces
        ws_free = Workspace(name="Free Exhausted", overage_enabled=False)
        ws_paid_good = Workspace(name="Paid Good", overage_enabled=False, provider_customer_id="cust_123")
        ws_paid_exhausted_no_overage = Workspace(name="Paid Exhausted No Overage", overage_enabled=False, provider_customer_id="cust_456")
        ws_paid_exhausted_overage = Workspace(name="Paid Exhausted Overage", overage_enabled=True, provider_customer_id="cust_789")
        
        db.add_all([ws_free, ws_paid_good, ws_paid_exhausted_no_overage, ws_paid_exhausted_overage])
        db.flush()
        
        # Create Subscriptions and Usages
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        # Paid Good (Limit 10, Used 5)
        sub_good = Subscription(workspace_id=ws_paid_good.id, plan_id=plan.id, status="active", billing_cycle="monthly", current_period_start=now)
        db.add(sub_good)
        db.flush()
        db.add(Usage(workspace_id=ws_paid_good.id, subscription_id=sub_good.id, tokens_used=5, period_start=now))
        
        # Paid Exhausted No Overage (Limit 10, Used 15)
        sub_no_overage = Subscription(workspace_id=ws_paid_exhausted_no_overage.id, plan_id=plan.id, status="active", billing_cycle="monthly", current_period_start=now)
        db.add(sub_no_overage)
        db.flush()
        db.add(Usage(workspace_id=ws_paid_exhausted_no_overage.id, subscription_id=sub_no_overage.id, tokens_used=15, period_start=now))
        
        # Paid Exhausted Overage (Limit 10, Used 15)
        sub_overage = Subscription(workspace_id=ws_paid_exhausted_overage.id, plan_id=plan.id, status="active", billing_cycle="monthly", current_period_start=now)
        db.add(sub_overage)
        db.flush()
        db.add(Usage(workspace_id=ws_paid_exhausted_overage.id, subscription_id=sub_overage.id, tokens_used=15, period_start=now))
        
        db.flush()

        # --- SCENARIO 1: Free Workspace Exhausted ---
        # Free workspace has no subscription. check_token_limit returns within_limit=True (0 overage) 
        # BUT no active subscription means Hard Block.
        print("Scenario 1: Free Workspace Exhausted")
        res1 = enforce_execution_policy(db, str(ws_free.id))
        assert res1 == False, f"Expected False, got {res1}"
        print("✅ Passed: HARD BLOCK applied to free user")

        # --- SCENARIO 3: Paid Workspace Within Limit ---
        print("\nScenario 3: Paid Workspace Within Limit")
        res3 = enforce_execution_policy(db, str(ws_paid_good.id))
        assert res3 == True, f"Expected True, got {res3}"
        print("✅ Passed: ALLOW applied to user within quota")

        # --- SCENARIO 4: Paid Workspace Exhausted + Overage OFF ---
        print("\nScenario 4: Paid Exhausted + Overage OFF")
        res4 = enforce_execution_policy(db, str(ws_paid_exhausted_no_overage.id))
        assert res4 == False, f"Expected False, got {res4}"
        print("✅ Passed: HARD BLOCK applied to user without overage enabled")

        # --- SCENARIO 5: Paid Workspace Exhausted + Overage ON ---
        print("\nScenario 5: Paid Exhausted + Overage ON")
        res5 = enforce_execution_policy(db, str(ws_paid_exhausted_overage.id))
        assert res5 == True, f"Expected True, got {res5}"
        print("✅ Passed: ALLOW OVERAGE applied to authorized user")

        print("\n🎉 All Logic Tests Passed Successfully!")

    except Exception as e:
        print(f"\n❌ Test Failed: {e}")
    finally:
        # Rollback all dummy data
        db.rollback()
        db.close()

if __name__ == "__main__":
    run_tests()
