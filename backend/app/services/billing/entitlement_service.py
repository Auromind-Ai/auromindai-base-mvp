import uuid
from typing import Dict, Any, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.core.enums import SubscriptionStatus
from app.models.plan_entitlement import PlanEntitlement

# Quota check models
from app.models.media import MediaFile
from app.models.workspace import WorkspaceMember
from app.models.brain import BrainEntry
from app.models.integration import Integration, CalendarEvent
from app.models.ai_action import Lead
from app.models.automation import AutomationFlow
from app.models.flow_pack import FlowPackPurchase


class EntitlementService:
    @classmethod
    def get_plan_entitlement(cls, db: Session, plan_id: uuid.UUID) -> PlanEntitlement | None:
        """Fetch plan entitlement configuration for a specific plan."""
        return db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == plan_id).first()

    @classmethod
    def get_workspace_entitlement(cls, db: Session, workspace_id: uuid.UUID) -> PlanEntitlement:
        if isinstance(workspace_id, str):
            workspace_id = uuid.UUID(workspace_id)

        # 1. Fetch active subscription
        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.workspace_id == workspace_id,
                Subscription.status == SubscriptionStatus.active,
            )
            .first()
        )

        plan = None
        if subscription and subscription.plan_id:
            plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()

        # 2. Fallback to default 'free' plan if no active plan
        if not plan:
            plan = db.query(Plan).filter(Plan.name == "free").first()

        if not plan:
            raise ValueError("No valid 'free' billing plan found in the database. Run migrations/seeds first.")

        # 3. Retrieve entitlements for the plan (do not insert)
        entitlement = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == plan.id).first()
        if not entitlement:
            raise ValueError(f"No plan entitlements config found in database for plan: {plan.name}")

        return entitlement

    @classmethod
    def check_entitlement(
        cls, db: Session, workspace_id: uuid.UUID, resource: str, value: int = 1
    ) -> Dict[str, Any]:
        if isinstance(workspace_id, str):
            workspace_id = uuid.UUID(workspace_id)
        entitlement = cls.get_workspace_entitlement(db, workspace_id)
        resource = resource.lower()

        # Handle feature flags
        if resource == "feature_flags" or resource.startswith("flag_") or resource == "has_rag":
            flag_name = resource.replace("flag_", "")
            if flag_name == "has_rag":
                flag_name = "has_rag"
            flag_value = entitlement.feature_flags.get(flag_name, False)
            limit_val = 1 if flag_value else 0
            usage_val = 0 if flag_value else 1
            allowed = bool(flag_value)
            reason = None if allowed else f"Feature '{flag_name}' is not enabled on your plan."
            return {
                "allowed": allowed,
                "current": usage_val,
                "limit": limit_val,
                "remaining": 0,
                "reason": reason,
            }

        # Quota checks
        if resource == "storage":
            # Sum bytes, convert to MB
            total_bytes = db.query(func.sum(MediaFile.file_size)).filter(MediaFile.workspace_id == workspace_id).scalar() or 0
            usage = int(total_bytes // (1024 * 1024))
            limit = entitlement.storage_limit_mb
        elif resource == "team":
            usage = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).count()
            limit = entitlement.team_limit
        elif resource == "knowledge_base" or resource == "kb":
            usage = db.query(BrainEntry).filter(BrainEntry.workspace_id == workspace_id).count()
            limit = entitlement.knowledge_base_limit
        elif resource == "gmail":
            usage = db.query(Integration).filter(
                Integration.workspace_id == workspace_id, Integration.integration_type == "gmail"
            ).count()
            limit = entitlement.gmail_limit
        elif resource == "lead":
            usage = db.query(Lead).filter(Lead.workspace_id == workspace_id).count()
            limit = entitlement.lead_limit
        elif resource == "meeting":
            usage = db.query(CalendarEvent).filter(CalendarEvent.workspace_id == workspace_id).count()
            limit = entitlement.meeting_limit
        elif resource == "automation":
            usage = db.query(AutomationFlow).filter(
                AutomationFlow.workspace_id == workspace_id, AutomationFlow.status == "Active"
            ).count()
            limit = entitlement.automation_limit
        elif resource == "flow":
            usage = db.query(AutomationFlow).filter(
                AutomationFlow.workspace_id == workspace_id
            ).count()
            plan_limit = getattr(entitlement, "max_flows", None) or getattr(entitlement, "flow", 5)
            if plan_limit == -1:
                limit = -1
            else:
                purchased = db.query(func.sum(FlowPackPurchase.flows_count)).filter(
                    FlowPackPurchase.workspace_id == workspace_id,
                    FlowPackPurchase.status == "success"
                ).scalar() or 0
                limit = plan_limit + purchased
        else:
            raise ValueError(f"Unknown entitlement resource type: {resource}")

        # If limit is -1, it represents Unlimited
        if limit == -1:
            return {
                "allowed": True,
                "current": usage,
                "limit": -1,
                "remaining": -1,
                "reason": None,
            }

        allowed = (usage + value) <= limit
        remaining = max(0, limit - usage)
        reason = None
        if not allowed:
            reason = f"Quota exceeded for resource '{resource}'. Current usage: {usage}, Limit: {limit}, Requested: {value}."

        return {
            "allowed": allowed,
            "current": usage,
            "limit": limit,
            "remaining": remaining,
            "reason": reason,
        }

    @classmethod
    def seed_default_entitlements(cls, db: Session) -> dict[str, Any]:
        """Seed default plans and entitlements in the database."""
        from app.services.billing.plan_service import PlanService
        plan_service = PlanService()
        plans = {}
        for plan_key in ["free", "pro", "enterprise"]:
            config = plan_service._get_plan_config(db, plan_key)
            plans[plan_key] = plan_service._get_or_create_plan(db, config)
        db.commit()

        seeded_count = 0
        for name, plan in plans.items():
            exist_check = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == plan.id).first()
            if not exist_check:
                if name == "free":
                    ent = PlanEntitlement(
                        id=uuid.uuid4(),
                        plan_id=plan.id,
                        included_ai_credits=1000,
                        included_wcc_wallet=0.00,
                        storage_limit_mb=500,
                        team_limit=2,
                        knowledge_base_limit=5,
                        gmail_limit=1,
                        lead_limit=100,
                        meeting_limit=10,
                        automation_limit=2,
                        allow_ai_topup=True,
                        allow_wcc_recharge=True,
                        included_credit_reset_policy='EXPIRE',
                        included_wallet_reset_policy='EXPIRE',
                        feature_flags={"has_rag": False, "has_leads": True, "has_gmail": True}
                    )
                elif name == "pro":
                    ent = PlanEntitlement(
                        id=uuid.uuid4(),
                        plan_id=plan.id,
                        included_ai_credits=100000,
                        included_wcc_wallet=0.00,
                        storage_limit_mb=10240,
                        team_limit=10,
                        knowledge_base_limit=100,
                        gmail_limit=5,
                        lead_limit=10000,
                        meeting_limit=-1,
                        automation_limit=20,
                        allow_ai_topup=True,
                        allow_wcc_recharge=True,
                        included_credit_reset_policy='EXPIRE',
                        included_wallet_reset_policy='EXPIRE',
                        feature_flags={"has_rag": True, "has_leads": True, "has_gmail": True}
                    )
                elif name == "enterprise":
                    ent = PlanEntitlement(
                        id=uuid.uuid4(),
                        plan_id=plan.id,
                        included_ai_credits=500000,
                        included_wcc_wallet=500.00,
                        storage_limit_mb=102400,
                        team_limit=50,
                        knowledge_base_limit=1000,
                        gmail_limit=-1,
                        lead_limit=-1,
                        meeting_limit=-1,
                        automation_limit=-1,
                        allow_ai_topup=True,
                        allow_wcc_recharge=True,
                        included_credit_reset_policy='ROLLOVER',
                        included_wallet_reset_policy='ROLLOVER',
                        feature_flags={"has_rag": True, "has_leads": True, "has_gmail": True}
                    )
                db.add(ent)
                seeded_count += 1
        db.commit()
        return {"status": "success", "message": f"Successfully seeded {seeded_count} entitlements."}
