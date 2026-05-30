import uuid
from typing import Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.plan import Plan
from app.services.billing.gateway.base import BillingPlanConfig
from app.services.platform_settings_service import get_setting


class PlanService:
    def _get_plan_config(self, db: Session, plan_key: str) -> BillingPlanConfig:
        key = (plan_key or "free").lower()
        if key not in ["free", "pro", "enterprise"]:
            raise ValueError(f"Unsupported plan: {plan_key}")

        label = (get_setting(db, f"{key}_plan_name", key.title()) or key.title()).strip()
        amount = int(float(get_setting(db, f"{key}_plan_price", 0) or 0))
        description = get_setting(db, f"{key}_plan_desc", "") or ""
        features = get_setting(db, f"{key}_plan_features", []) or []

        token_limits = get_setting(db, "token_limit_per_plan", {})
        tokens = token_limits.get(key) or token_limits.get("free", 100)

        provider_plan_ids = {
            "razorpay": getattr(settings, f"RAZORPAY_{key.upper()}_PLAN_ID", None) if key != "free" else None,
            "payu": getattr(settings, f"PAYU_{key.upper()}_PLAN_ID", None) if key != "free" else None,
        }

        return BillingPlanConfig(
            key=key,
            label=label,
            amount=amount,
            currency="INR",
            tokens=tokens,
            provider_plan_ids=provider_plan_ids,
            description=description,
            features=features,
        )

    def _get_or_create_plan(self, db: Session, config: BillingPlanConfig) -> Plan:
        billing_cycle = "monthly"
        plan = (
            db.query(Plan)
            .filter(
                Plan.name == config.key,
                Plan.billing_cycle == billing_cycle,
                Plan.currency == config.currency,
            )
            .first()
        )
        if plan:
            plan.price = config.amount
            plan.token_limit = config.tokens
            plan.features = config.features
            plan.is_active = True
            return plan

        plan = Plan(
            id=uuid.uuid4(),
            name=config.key,
            price=config.amount,
            token_limit=config.tokens,
            workspace_limit=1,
            billing_cycle=billing_cycle,
            currency=config.currency,
            is_active=True,
            features=config.features,
        )
        db.add(plan)
        db.flush()
        return plan

    def _serialize_plan(self, db: Session, key: str) -> dict[str, Any]:
        config = self._get_plan_config(db, key)
        return {
            "key": config.key,
            "label": config.label,
            "amount": config.amount,
            "currency": config.currency,
            "tokens": config.tokens,
            "credits": float(config.tokens) / 1000,  # TOKENS_PER_CREDIT = 1000
            "description": config.description,
            "features": config.features,
            "providers": {
                name: bool(plan_id) for name, plan_id in config.provider_plan_ids.items()
            },
            "is_upgradeable": any(config.provider_plan_ids.values()) and config.key != "free",
        }
