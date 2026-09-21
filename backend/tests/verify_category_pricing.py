import uuid
from decimal import Decimal
from app.database import SessionLocal
from app.services.wcc_service import WCCService, normalize_wcc_category
from app.services.marketing.campaign_service import CampaignService
from app.models.workspace import Workspace

def run_tests():
    db = SessionLocal()
    ws = db.query(Workspace).first()
    ws_id = ws.id if ws else uuid.uuid4()

    test_cases = [
        ("promotional", "marketing", Decimal("1.25"), Decimal("1.09")),
        ("marketing", "marketing", Decimal("1.25"), Decimal("1.09")),
        ("MARKETING", "marketing", Decimal("1.25"), Decimal("1.09")),
        ("transactional", "utility", Decimal("0.18"), Decimal("0.145")),
        ("utility", "utility", Decimal("0.18"), Decimal("0.145")),
        ("UTILITY", "utility", Decimal("0.18"), Decimal("0.145")),
        ("service", "service", Decimal("0.05"), Decimal("0.00")),
        ("Customer Support", "service", Decimal("0.05"), Decimal("0.00")),
        ("authentication", "authentication", Decimal("0.18"), Decimal("0.145")),
        ("OTP", "authentication", Decimal("0.18"), Decimal("0.145")),
    ]

    print("=== Category Pricing Verification ===")
    for input_cat, expected_norm, expected_cust, expected_meta in test_cases:
        norm = normalize_wcc_category(input_cat)
        assert norm == expected_norm, f"Expected {expected_norm}, got {norm} for input {input_cat}"
        
        est = CampaignService.calculate_preflight_estimation(
            db=db,
            workspace_id=ws_id,
            valid_recipients_count=1000,
            category=input_cat
        )
        rate = Decimal(str(est["rate_per_message"]))
        meta = Decimal(str(est["meta_rate"]))
        total_cost = Decimal(str(est["estimated_cost"]))

        assert rate == expected_cust, f"Expected rate {expected_cust}, got {rate} for {input_cat}"
        assert meta == expected_meta, f"Expected meta {expected_meta}, got {meta} for {input_cat}"
        assert total_cost == expected_cust * 1000, f"Expected total cost {expected_cust * 1000}, got {total_cost}"
        print(f"PASS: {input_cat:18} -> {norm:15} -> Rs {rate:.4f}/msg (Meta: Rs {meta:.4f}, Total: Rs {total_cost:.2f})")

    print("\nALL CATEGORY PRICING TESTS PASSED 100% GREEN!")

if __name__ == "__main__":
    run_tests()
