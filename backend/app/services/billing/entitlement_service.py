import uuid
from typing import Dict, Any, Tuple, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.core.enums import SubscriptionStatus
from app.models.plan_entitlement import PlanEntitlement

from app.models.flow_pack import FlowPackPurchase, PurchaseStatus
from app.models.workspace import Workspace, WorkspaceMember
from app.models.media import MediaFile
from app.models.brain import BrainEntry
from app.models.integration import Integration, CalendarEvent
from app.models.ai_action import Lead
from app.models.automation import AutomationFlow


class EffectiveEntitlement:
    def __init__(self, plan_entitlement: PlanEntitlement, workspace: Optional[Workspace] = None):
        self.id = getattr(plan_entitlement, "id", None)
        self.plan_id = getattr(plan_entitlement, "plan_id", None)
        self.included_ai_credits = getattr(plan_entitlement, "included_ai_credits", 0)
        self.included_wcc_wallet = getattr(plan_entitlement, "included_wcc_wallet", 0.0)
        self.storage_limit_mb = getattr(plan_entitlement, "storage_limit_mb", 500)
        self.team_limit = getattr(plan_entitlement, "team_limit", 2)
        self.knowledge_base_limit = getattr(plan_entitlement, "knowledge_base_limit", 5)
        self.gmail_limit = getattr(plan_entitlement, "gmail_limit", 1)
        self.lead_limit = getattr(plan_entitlement, "lead_limit", 100)
        self.meeting_limit = getattr(plan_entitlement, "meeting_limit", 10)
        self.automation_limit = getattr(plan_entitlement, "automation_limit", 2)
        self.flow = getattr(plan_entitlement, "flow", 2)

        # Purchase permissions (PlanEntitlement level)
        self.allow_ai_topup = getattr(plan_entitlement, "allow_ai_topup", True)
        self.allow_wcc_recharge = getattr(plan_entitlement, "allow_wcc_recharge", True)
        self.allow_flow_addon = getattr(plan_entitlement, "allow_flow_addon", True)

        self.included_credit_reset_policy = getattr(plan_entitlement, "included_credit_reset_policy", "EXPIRE")
        self.included_wallet_reset_policy = getattr(plan_entitlement, "included_wallet_reset_policy", "EXPIRE")
        self.feature_flags = getattr(plan_entitlement, "feature_flags", {})

        # Purchased Resource Usage Permissions (Workspace Overrides -> PlanEntitlement fallback)
        ws_ai_ov = getattr(workspace, "override_allow_purchased_ai_usage", None) if workspace else None
        ws_wcc_ov = getattr(workspace, "override_allow_purchased_wcc_usage", None) if workspace else None
        ws_flow_ov = getattr(workspace, "override_allow_purchased_flow_usage", None) if workspace else None

        self.allow_purchased_ai_usage = ws_ai_ov if ws_ai_ov is not None else getattr(plan_entitlement, "allow_purchased_ai_usage", False)
        self.allow_purchased_wcc_usage = ws_wcc_ov if ws_wcc_ov is not None else getattr(plan_entitlement, "allow_purchased_wcc_usage", False)
        self.allow_purchased_flow_usage = ws_flow_ov if ws_flow_ov is not None else getattr(plan_entitlement, "allow_purchased_flow_usage", False)

        # Expose raw workspace override settings for inspectability
        self.override_allow_purchased_ai_usage = ws_ai_ov
        self.override_allow_purchased_wcc_usage = ws_wcc_ov
        self.override_allow_purchased_flow_usage = ws_flow_ov

        # Timestamps from the underlying PlanEntitlement row (required by PlanEntitlementResponse)
        self.created_at = getattr(plan_entitlement, "created_at", None)
        self.updated_at = getattr(plan_entitlement, "updated_at", None)


class EntitlementService:
    @classmethod
    def get_flow_quota(cls, db: Session, workspace_id: uuid.UUID | str) -> Dict[str, Any]:
      
        from datetime import datetime, timezone
        if isinstance(workspace_id, str):
            workspace_id = uuid.UUID(workspace_id)

        # 1. Check active paid subscription & period end expiration
        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.workspace_id == workspace_id,
                Subscription.status == SubscriptionStatus.active,
            )
            .first()
        )

        is_active_paid = False
        active_plan = None
        if subscription and subscription.plan_id:
            plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
            if plan and plan.name.lower() != "free":
                if subscription.current_period_end:
                    now_utc = datetime.now(timezone.utc)
                    end_utc = subscription.current_period_end
                    if isinstance(end_utc, datetime):
                        if end_utc.tzinfo is None:
                            end_utc = end_utc.replace(tzinfo=timezone.utc)
                        if end_utc >= now_utc:
                            is_active_paid = True
                            active_plan = plan
                    else:
                        is_active_paid = True
                        active_plan = plan
                else:
                    is_active_paid = True
                    active_plan = plan

        entitlement = cls.get_workspace_entitlement(db, workspace_id)

        raw_pq = getattr(entitlement, "flow", None) if entitlement else 5
        if raw_pq is None or raw_pq == 0:
            raw_pq = getattr(entitlement, "automation_limit", None) if entitlement else 5
        try:
            plan_quota = int(raw_pq)
        except (ValueError, TypeError):
            plan_quota = 20

        status_filter = PurchaseStatus.SUCCESS.value if hasattr(PurchaseStatus.SUCCESS, "value") else "success"

        try:
            raw_val = (
                db.query(func.sum(FlowPackPurchase.flows_count))
                .filter(
                    FlowPackPurchase.workspace_id == workspace_id,
                    FlowPackPurchase.status == status_filter,
                )
                .scalar()
            )
            raw_purchased_quota = int(raw_val) if raw_val is not None else 0
        except (ValueError, TypeError):
            raw_purchased_quota = 5

        try:
            used_val = (
                db.query(AutomationFlow)
                .filter(AutomationFlow.workspace_id == workspace_id)
                .count()
            )
            used_quota = int(used_val) if used_val is not None else 0
        except (ValueError, TypeError):
            used_quota = 1

        if is_active_paid and getattr(entitlement, "allow_purchased_flow_usage", True):
            purchased_quota = raw_purchased_quota
            purchased_locked = False
            status_message = None
            if plan_quota == -1:
                total_quota = -1
                remaining_quota = -1
            else:
                total_quota = plan_quota + purchased_quota
                remaining_quota = max(0, total_quota - used_quota)
        elif getattr(entitlement, "allow_purchased_flow_usage", False):
            # Admin explicitly granted purchased flow usage on Free/Expired plan
            purchased_quota = raw_purchased_quota
            purchased_locked = False
            status_message = None
            if plan_quota == -1:
                total_quota = -1
                remaining_quota = -1
            else:
                total_quota = plan_quota + purchased_quota
                remaining_quota = max(0, total_quota - used_quota)
        else:
            # Free or Expired & purchased flow usage denied: Purchased flows are LOCKED 🔒
            purchased_quota = raw_purchased_quota
            purchased_locked = (raw_purchased_quota > 0)
            status_message = "🔒 Purchased flows on hold — Upgrade to Pro to unlock" if (raw_purchased_quota > 0) else None
            # Total usable quota on Free/Expired plan is strictly Free Plan quota only
            total_quota = plan_quota
            remaining_quota = max(0, total_quota - used_quota)

        return {
            "plan_quota": plan_quota,
            "purchased_quota": purchased_quota,
            "purchased_locked": purchased_locked,
            "status_message": status_message,
            "total_quota": total_quota,
            "used_quota": used_quota,
            "remaining_quota": remaining_quota,
            "is_subscription_active": is_active_paid,
            # Aliases for backward compatibility
            "plan_base": plan_quota,
            "purchased": purchased_quota,
            "total": total_quota,
            "used": used_quota,
            "remaining": remaining_quota,
        }

    @classmethod
    def ensure_plan_entitlement(cls, db: Session, plan: Plan) -> PlanEntitlement:
        
        existing = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == plan.id).first()
        if existing:
            return existing

        plan_key = (getattr(plan, "key", None) or plan.name or "").lower().strip()

        # 2. Known Plan Templates vs Conservative Unknown Defaults
        if plan_key == "free" or plan_key.startswith("free"):
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
                flow=2,
                allow_ai_topup=False,
                allow_purchased_ai_usage=False,
                allow_wcc_recharge=False,
                allow_purchased_wcc_usage=False,
                allow_flow_addon=False,
                allow_purchased_flow_usage=False,
                included_credit_reset_policy='EXPIRE',
                included_wallet_reset_policy='EXPIRE',
                feature_flags={"has_rag": False, "has_leads": True, "has_gmail": True}
            )
        elif plan_key == "solo" or plan_key.startswith("solo"):
            ent = PlanEntitlement(
                id=uuid.uuid4(),
                plan_id=plan.id,
                included_ai_credits=15000,
                included_wcc_wallet=0.00,
                storage_limit_mb=1024,
                team_limit=1,
                knowledge_base_limit=10,
                gmail_limit=1,
                lead_limit=500,
                meeting_limit=10,
                automation_limit=2,
                flow=2,
                allow_ai_topup=True,
                allow_purchased_ai_usage=True,
                allow_wcc_recharge=True,
                allow_purchased_wcc_usage=True,
                allow_flow_addon=True,
                allow_purchased_flow_usage=True,
                included_credit_reset_policy='EXPIRE',
                included_wallet_reset_policy='EXPIRE',
                feature_flags={"has_rag": True, "has_leads": True, "has_gmail": True}
            )
        elif plan_key == "pro" or plan_key.startswith("pro") or plan_key.startswith("plan"):
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
                flow=20,
                allow_ai_topup=True,
                allow_purchased_ai_usage=True,
                allow_wcc_recharge=True,
                allow_purchased_wcc_usage=True,
                allow_flow_addon=True,
                allow_purchased_flow_usage=True,
                included_credit_reset_policy='EXPIRE',
                included_wallet_reset_policy='EXPIRE',
                feature_flags={"has_rag": True, "has_leads": True, "has_gmail": True}
            )
        elif plan_key == "enterprise" or plan_key.startswith("enterprise"):
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
                flow=-1,
                allow_ai_topup=True,
                allow_purchased_ai_usage=True,
                allow_wcc_recharge=True,
                allow_purchased_wcc_usage=True,
                allow_flow_addon=True,
                allow_purchased_flow_usage=True,
                included_credit_reset_policy='ROLLOVER',
                included_wallet_reset_policy='ROLLOVER',
                feature_flags={"has_rag": True, "has_leads": True, "has_gmail": True}
            )
        else:
            # Conservative Zero-Trust Defaults for Unknown / Custom Plans
            ent = PlanEntitlement(
                id=uuid.uuid4(),
                plan_id=plan.id,
                included_ai_credits=0,
                included_wcc_wallet=0.00,
                storage_limit_mb=0,
                team_limit=0,
                knowledge_base_limit=0,
                gmail_limit=0,
                lead_limit=0,
                meeting_limit=0,
                automation_limit=0,
                flow=0,
                allow_ai_topup=False,
                allow_purchased_ai_usage=False,
                allow_wcc_recharge=False,
                allow_purchased_wcc_usage=False,
                allow_flow_addon=False,
                allow_purchased_flow_usage=False,
                included_credit_reset_policy='EXPIRE',
                included_wallet_reset_policy='EXPIRE',
                feature_flags={}
            )

        db.add(ent)
        db.flush()
        return ent

    @classmethod
    def get_plan_entitlement(cls, db: Session, plan_id: uuid.UUID) -> PlanEntitlement | None:
        """Fetch plan entitlement configuration for a specific plan."""
        return db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == plan_id).first()

    @classmethod
    def get_workspace_entitlement(cls, db: Session, workspace_id: uuid.UUID) -> PlanEntitlement:
        from datetime import datetime, timezone
        if isinstance(workspace_id, str):
            workspace_id = uuid.UUID(workspace_id)

        # 1. Fetch active subscription & verify period end expiration
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
            if subscription.current_period_end:
                now_utc = datetime.now(timezone.utc)
                end_utc = subscription.current_period_end
                if isinstance(end_utc, datetime):
                    if end_utc.tzinfo is None:
                        end_utc = end_utc.replace(tzinfo=timezone.utc)
                    if end_utc >= now_utc:
                        plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
                else:
                    plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
            else:
                plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()

        # 2. Fallback to default 'free' plan if no active paid plan or expired
        if not plan or (getattr(plan, "name", "") and plan.name.lower() == "free"):
            plan = db.query(Plan).filter(func.lower(Plan.name) == "free").first()
            if not plan:
                from app.services.billing.plan_service import PlanService
                plan_service = PlanService()
                free_config = plan_service._get_plan_config(db, "free")
                plan = plan_service._get_or_create_plan(db, free_config)
                db.flush()

        # 3. Retrieve or ensure entitlements for the plan
        entitlement = cls.ensure_plan_entitlement(db, plan)
        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first() if workspace_id else None
        return EffectiveEntitlement(entitlement, ws)

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
            flow_q = cls.get_flow_quota(db, workspace_id)
            usage = flow_q["used_quota"]
            limit = flow_q["total_quota"]
        elif resource in ("ai_topup", "ai_credit_recharge", "can_topup_ai"):
            allowed = bool(getattr(entitlement, "allow_ai_topup", True))
            return {
                "allowed": allowed,
                "current": 0,
                "limit": 1 if allowed else 0,
                "remaining": 1 if allowed else 0,
                "reason": None if allowed else "AI Credit top-up is not available for your current plan. Please upgrade to Pro."
            }
        elif resource in ("wcc_recharge", "wallet_recharge", "can_recharge_wcc"):
            allowed = bool(getattr(entitlement, "allow_wcc_recharge", True))
            return {
                "allowed": allowed,
                "current": 0,
                "limit": 1 if allowed else 0,
                "remaining": 1 if allowed else 0,
                "reason": None if allowed else "WhatsApp Wallet recharge is not available for your current plan. Please upgrade to Pro."
            }
        elif resource in ("flow_addon", "flow_pack_purchase", "can_purchase_flow_addon"):
            allowed = bool(getattr(entitlement, "allow_flow_addon", True))
            return {
                "allowed": allowed,
                "current": 0,
                "limit": 1 if allowed else 0,
                "remaining": 1 if allowed else 0,
                "reason": None if allowed else "Flow Pack add-on purchase is not available for your current plan. Please upgrade to Pro."
            }
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
        for plan_key in ["free", "solo", "pro", "enterprise"]:
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
                elif name == "solo":
                    ent = PlanEntitlement(
                        id=uuid.uuid4(),
                        plan_id=plan.id,
                        included_ai_credits=15000,
                        included_wcc_wallet=0.00,
                        storage_limit_mb=1024,
                        team_limit=1,
                        knowledge_base_limit=10,
                        gmail_limit=1,
                        lead_limit=500,
                        meeting_limit=10,
                        automation_limit=2,
                        allow_ai_topup=True,
                        allow_wcc_recharge=True,
                        included_credit_reset_policy='EXPIRE',
                        included_wallet_reset_policy='EXPIRE',
                        feature_flags={"has_rag": True, "has_leads": True, "has_gmail": True}
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


