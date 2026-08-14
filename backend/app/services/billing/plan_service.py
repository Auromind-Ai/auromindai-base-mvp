import uuid
from typing import Any
from sqlalchemy.orm import Session
from app.models.plan import Plan
from app.services.billing.gateway.base import BillingPlanConfig
from app.services.platform_settings_service import get_setting
from app.services.config_service import config_service

class PlanService:
    def _get_plan_config(self, db: Session, plan_key: str, billing_cycle: str = "monthly") -> BillingPlanConfig:
        key = (plan_key or "free").lower().strip()
        billing_cycle = (billing_cycle or "monthly").lower().strip()

        # 1. First query DB Plan table
        db_plan = db.query(Plan).filter(Plan.name == key).first()
        
        if db_plan:
            label = db_plan.display_name or key.title()
            if billing_cycle == "yearly" and key != "free":
                amount = float(db_plan.yearly_price)
            else:
                amount = float(db_plan.monthly_price)
            
            description = db_plan.description or ""
            features = db_plan.features or []
            tokens = db_plan.token_limit or 0
            currency = db_plan.currency or "INR"
        else:
            # Fallback to platform settings
            label = (get_setting(db, f"{key}_plan_name", key.title()) or key.title()).strip()
            if billing_cycle == "yearly" and key != "free":
                yearly_override = get_setting(db, f"{key}_yearly_plan_price", None)
                if yearly_override is not None:
                    amount = float(yearly_override)
                else:
                    amount = float(get_setting(db, f"{key}_plan_price", 0) or 0) * 10
            else:
                amount = float(get_setting(db, f"{key}_plan_price", 0) or 0)

            description = get_setting(db, f"{key}_plan_desc", "") or ""
            features = get_setting(db, f"{key}_plan_features", []) or []

            token_limits = get_setting(db, "token_limit_per_plan", {})
            tokens_val = token_limits.get(key)
            tokens = tokens_val if tokens_val is not None else (15000000 if key == "solo" else (100000000 if key == "pro" else 1000000))
            currency = "INR"

      
        provider_suffix = "_yearly" if billing_cycle == "yearly" else ""
        provider_plan_ids = {
            "razorpay": config_service.get(f"razorpay_{key}{provider_suffix}_plan_id") or (config_service.get(f"razorpay_{key}_plan_id") if key != "free" else None),
            "payu": config_service.get(f"payu_{key}{provider_suffix}_plan_id") or (config_service.get(f"payu_{key}_plan_id") if key != "free" else None),
        }

        return BillingPlanConfig(
            key=key,
            label=label,
            amount=amount,
            currency=currency,
            tokens=tokens,
            provider_plan_ids=provider_plan_ids,
            description=description,
            features=features,
        )

    def _get_or_create_plan(self, db: Session, config: BillingPlanConfig, billing_cycle: str = "monthly") -> Plan:
        billing_cycle = (billing_cycle or "monthly").lower()
        plan = db.query(Plan).filter(Plan.name == config.key).first()
        
        if plan:
            if billing_cycle == "yearly":
                plan.yearly_price = float(config.amount)
            else:
                plan.monthly_price = float(config.amount)
                plan.price = float(config.amount)
            plan.token_limit = config.tokens
            plan.features = config.features
            plan.is_active = True
            return plan

        monthly_amt = float(config.amount) if billing_cycle != "yearly" else float(config.amount / 10)
        yearly_amt = float(config.amount) if billing_cycle == "yearly" else float(config.amount * 10)

        plan = Plan(
            id=uuid.uuid4(),
            name=config.key,
            display_name=config.label,
            price=monthly_amt,
            monthly_price=monthly_amt,
            yearly_price=yearly_amt,
            token_limit=config.tokens,
            workspace_limit=1,
            billing_cycle="monthly",
            currency=config.currency,
            is_active=True,
            features=config.features,
            description=config.description,
        )
        db.add(plan)
        db.flush()
        return plan

    def _serialize_plan(self, db: Session, key: str, billing_cycle: str = "monthly") -> dict[str, Any]:
        config = self._get_plan_config(db, key, billing_cycle)
        db_plan = db.query(Plan).filter(Plan.name == key).first()
        monthly_price = db_plan.monthly_price if db_plan else config.amount
        yearly_price = db_plan.yearly_price if db_plan else (config.amount * 10)
        
        return {
            "key": config.key,
            "label": config.label,
            "name": config.label,
            "amount": config.amount,
            "monthly_price": monthly_price,
            "yearly_price": yearly_price,
            "currency": config.currency,
            "tokens": config.tokens,
            "credits": float(config.tokens) / 1000,
            "description": config.description,
            "features": config.features,
            "providers": {
                name: bool(plan_id) for name, plan_id in config.provider_plan_ids.items()
            },
            "is_upgradeable": config.key != "free",
        }
