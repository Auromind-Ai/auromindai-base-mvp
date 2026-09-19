import uuid
import logging
from decimal import Decimal
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

from app.models.campaign import Campaign, CampaignRecipient
from app.models.wcc import WCCWallet, WCCRateCard
from app.models.workspace import Workspace
from app.models.templates import Template
from app.services.wcc_service import WCCService, InsufficientWCCBalanceError
from app.services.marketing.whatsapp_tier_service import WhatsAppTierService
from app.core.redis_lock import get_redis_client

logger = logging.getLogger(__name__)


class CampaignService:
    @staticmethod
    def _get_redis():
        try:
            return get_redis_client()
        except Exception:
            return None

    @classmethod
    def calculate_preflight_estimation(
        cls,
        db: Session,
        workspace_id: uuid.UUID,
        valid_recipients_count: int,
        category: str = "marketing",
    ) -> Dict[str, Any]:
        """
        Calculates cost, verifies wallet balance, and checks 24-hour Meta Portfolio capacity.
        """
        estimate = WCCService.calculate_estimate(
            db=db,
            workspace_id=workspace_id,
            audience_size=valid_recipients_count,
            category=category
        )
        estimated_cost = Decimal(str(estimate.get("estimated_cost", "0.00")))
        rate_per_msg = Decimal(str(estimate.get("customer_price", "0.80")))

        # Fetch wallet
        wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == workspace_id).first()
        current_balance = Decimal(str(wallet.balance)) if wallet else Decimal("0.00")
        held_balance = Decimal(str(getattr(wallet, "held_balance", 0.0))) if wallet else Decimal("0.00")
        available_balance = max(Decimal("0.00"), current_balance - held_balance)

        is_sufficient = available_balance >= estimated_cost

        # Fetch Workspace details for Meta Portfolio capacity
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        portfolio_id = getattr(workspace, "meta_business_id", None) or getattr(workspace, "meta_waba_id", None) or str(workspace_id)

        redis_client = cls._get_redis()
        portfolio_usage = WhatsAppTierService.get_portfolio_usage(
            redis_client=redis_client,
            portfolio_id=portfolio_id,
            portfolio_tier_limit=2000
        )

        return {
            "estimated_cost": float(estimated_cost),
            "rate_per_message": float(rate_per_msg),
            "current_balance": float(current_balance),
            "held_balance": float(held_balance),
            "available_balance": float(available_balance),
            "is_balance_sufficient": is_sufficient,
            "shortfall": float(max(Decimal("0.00"), estimated_cost - available_balance)),
            "portfolio_tier_limit": portfolio_usage.get("limit", 2000),
            "portfolio_used_today": portfolio_usage.get("used", 0),
            "portfolio_remaining_today": portfolio_usage.get("remaining", 2000),
            "next_unlock_at": portfolio_usage.get("next_unlock_at")
        }

    @classmethod
    def reserve_campaign_escrow(
        cls,
        db: Session,
        workspace_id: uuid.UUID,
        estimated_cost: Decimal
    ) -> bool:
        if estimated_cost <= Decimal("0.00"):
            return True

        sql = text("""
            UPDATE wcc_wallets
            SET held_balance = held_balance + :cost,
                updated_at = NOW()
            WHERE workspace_id = :workspace_id
              AND (balance - held_balance) >= :cost
        """)
        result = db.execute(sql, {"cost": float(estimated_cost), "workspace_id": workspace_id})
        db.commit()

        if result.rowcount == 0:
            wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == workspace_id).first()
            curr = wallet.balance if wallet else 0
            held = getattr(wallet, "held_balance", 0) if wallet else 0
            avail = max(0, curr - held)
            raise InsufficientWCCBalanceError(
                required=estimated_cost,
                available=Decimal(str(avail)),
                shortfall=estimated_cost - Decimal(str(avail))
            )
        return True

    @classmethod
    def settle_message_cost(
        cls,
        db: Session,
        workspace_id: uuid.UUID,
        message_cost: Decimal
    ):
        if message_cost <= Decimal("0.00"):
            return

        sql = text("""
            UPDATE wcc_wallets
            SET balance = balance - :cost,
                held_balance = GREATEST(0.0, held_balance - :cost),
                updated_at = NOW()
            WHERE workspace_id = :workspace_id
        """)
        db.execute(sql, {"cost": float(message_cost), "workspace_id": workspace_id})
        db.commit()

    @classmethod
    def release_unspent_escrow(
        cls,
        db: Session,
        workspace_id: uuid.UUID,
        unused_amount: Decimal
    ):
        if unused_amount <= Decimal("0.00"):
            return

        sql = text("""
            UPDATE wcc_wallets
            SET held_balance = GREATEST(0.0, held_balance - :amount),
                updated_at = NOW()
            WHERE workspace_id = :workspace_id
        """)
        db.execute(sql, {"amount": float(unused_amount), "workspace_id": workspace_id})
        db.commit()

    @classmethod
    def create_campaign(
        cls,
        db: Session,
        workspace_id: uuid.UUID,
        user_id: Optional[uuid.UUID],
        data: Dict[str, Any]
    ) -> Campaign:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        phone_number_id = data.get("phone_number_id") or workspace.meta_phone_number_id
        if not phone_number_id:
            raise HTTPException(status_code=400, detail="No WhatsApp phone number connected to workspace")

        portfolio_id = workspace.meta_business_id or workspace.meta_waba_id or str(workspace_id)
        raw_recipients = data.get("recipients", [])

        campaign = Campaign(
            workspace_id=workspace_id,
            created_by=user_id,
            name=data.get("name", "Untitled Campaign"),
            campaign_type=data.get("campaign_type", "promotional"),
            campaign_goal=data.get("campaign_goal"),
            portfolio_id=portfolio_id,
            phone_number_id=phone_number_id,
            status="draft",
            audience_source=data.get("audience_source", "existing_contacts"),
            total_recipients=len(raw_recipients),
            valid_recipients=data.get("valid_recipients", len(raw_recipients)),
            invalid_recipients=data.get("invalid_recipients", 0),
            message_type=data.get("message_type", "template"),
            template_id=data.get("template_id"),
            message_content=data.get("message_content"),
            media_url=data.get("media_url"),
            media_type=data.get("media_type"),
            schedule_type=data.get("schedule_type", "now"),
            scheduled_at=data.get("scheduled_at"),
            timezone=data.get("timezone", "Asia/Kolkata"),
            send_gradually=data.get("send_gradually", True),
            messages_per_minute=data.get("messages_per_minute", 100),
            skip_invalid_numbers=data.get("skip_invalid_numbers", True),
            stop_on_high_failure_rate=data.get("stop_on_high_failure_rate", False),
            failure_rate_threshold=data.get("failure_rate_threshold", 10.0),
            quiet_hours_enabled=data.get("quiet_hours_enabled", False),
            quiet_hours_start=data.get("quiet_hours_start", "22:00"),
            quiet_hours_end=data.get("quiet_hours_end", "08:00"),
            estimated_cost=data.get("estimated_cost", 0.0),
        )
        db.add(campaign)
        db.flush()

        # Batch insert recipients
        recipient_objs = []
        for r in raw_recipients:
            recipient_objs.append(CampaignRecipient(
                campaign_id=campaign.id,
                workspace_id=workspace_id,
                lead_id=r.get("lead_id"),
                phone_number=r.get("phone_number", ""),
                normalized_phone=r.get("normalized_phone", r.get("phone_number", "")),
                recipient_name=r.get("recipient_name"),
                variables=r.get("variables", {}),
                status="pending"
            ))

        if recipient_objs:
            db.bulk_save_objects(recipient_objs)

        db.commit()
        db.refresh(campaign)
        return campaign

    @classmethod
    def launch_campaign(cls, db: Session, campaign_id: uuid.UUID) -> Campaign:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        if campaign.status in ("in_progress", "completed"):
            raise HTTPException(status_code=400, detail=f"Campaign is already {campaign.status}")

        # 1. Preflight calculation & escrow reservation
        est = cls.calculate_preflight_estimation(
            db=db,
            workspace_id=campaign.workspace_id,
            valid_recipients_count=campaign.valid_recipients,
            category="marketing"
        )
        cost_decimal = Decimal(str(est["estimated_cost"]))

        # 2. Lock escrow in wallet
        cls.reserve_campaign_escrow(db, campaign.workspace_id, cost_decimal)

        campaign.held_cost = float(cost_decimal)
        campaign.estimated_cost = float(cost_decimal)

        # 3. Schedule or start immediately
        now_utc = datetime.now(timezone.utc)
        if campaign.schedule_type == "later" and campaign.scheduled_at and campaign.scheduled_at > now_utc:
            campaign.status = "scheduled"
            db.commit()
            # Celery beat or scheduler will pick it up
            from app.workers.campaign_worker import orchestrate_campaign
            delay_sec = int((campaign.scheduled_at - now_utc).total_seconds())
            orchestrate_campaign.apply_async(args=[str(campaign.id)], countdown=delay_sec)
        else:
            campaign.status = "in_progress"
            campaign.started_at = now_utc
            db.commit()

            # Celery dispatch
            from app.workers.campaign_worker import orchestrate_campaign
            orchestrate_campaign.delay(str(campaign.id))

        db.refresh(campaign)
        return campaign

    @classmethod
    def pause_campaign(cls, db: Session, campaign_id: uuid.UUID, reason: str = "MANUAL_PAUSE") -> Campaign:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        campaign.status = "paused"
        campaign.paused_reason = reason
        db.commit()
        db.refresh(campaign)
        return campaign

    @classmethod
    def resume_campaign(cls, db: Session, campaign_id: uuid.UUID) -> Campaign:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        campaign.status = "in_progress"
        campaign.paused_reason = None
        db.commit()

        from app.workers.campaign_worker import orchestrate_campaign
        orchestrate_campaign.delay(str(campaign.id))

        db.refresh(campaign)
        return campaign

    @classmethod
    def cancel_campaign(cls, db: Session, campaign_id: uuid.UUID) -> Campaign:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        # Mark all pending/queued recipients as cancelled
        db.query(CampaignRecipient).filter(
            CampaignRecipient.campaign_id == campaign_id,
            CampaignRecipient.status.in_(("pending", "queued", "held_portfolio_limit"))
        ).update({"status": "cancelled"}, synchronize_session=False)

        campaign.status = "cancelled"
        campaign.completed_at = datetime.now(timezone.utc)

        # Release all remaining held escrow
        unspent_cost = max(Decimal("0.00"), Decimal(str(campaign.held_cost)) - Decimal(str(campaign.actual_cost)))
        if unspent_cost > Decimal("0.00"):
            cls.release_unspent_escrow(db, campaign.workspace_id, unspent_cost)
            campaign.held_cost = campaign.actual_cost

        db.commit()
        db.refresh(campaign)
        return campaign
