from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session
from app.models.feature_billing_rule import FeatureBillingRule


class FeatureBillingService:
    ALLOWED_BILLING_TYPES = {"TOKEN", "FLAT", "PER_MB", "PER_MINUTE", "PER_REQUEST"}

    @classmethod
    def get_rule(cls, db: Session, feature_key: str) -> FeatureBillingRule | None:
        """Retrieve the feature billing rule by its unique key."""
        return (
            db.query(FeatureBillingRule)
            .filter(
                FeatureBillingRule.feature_key == feature_key,
                FeatureBillingRule.is_active == True,
            )
            .first()
        )

    @classmethod
    def calculate_cost(cls, db: Session, feature_key: str, usage_amount: float = 1.0) -> Decimal:
    
        rule = cls.get_rule(db, feature_key)
        if not rule:
            raise ValueError(f"No active billing rule configured for feature: {feature_key}")

        cls.validate_rule(rule)

        usage_dec = Decimal(str(usage_amount))
        unit_dec = Decimal(str(rule.unit_value))
        cost_dec = Decimal(str(rule.credit_cost))

        return (usage_dec / unit_dec) * cost_dec

    @classmethod
    def validate_rule(cls, rule: FeatureBillingRule) -> None:
        """Validate feature billing rule constraints."""
        if not rule.feature_key:
            raise ValueError("Feature key cannot be empty.")
        if rule.billing_type not in cls.ALLOWED_BILLING_TYPES:
            raise ValueError(f"Invalid billing type '{rule.billing_type}'. Allowed: {cls.ALLOWED_BILLING_TYPES}")
        if rule.unit_value <= 0:
            raise ValueError("Unit value must be a positive integer.")
        if rule.credit_cost < 0:
            raise ValueError("Credit cost cannot be negative.")

    @classmethod
    def list_rules(cls, db: Session) -> List[FeatureBillingRule]:
        """Fetch list of all active feature billing rules."""
        return db.query(FeatureBillingRule).filter(FeatureBillingRule.is_active == True).all()
