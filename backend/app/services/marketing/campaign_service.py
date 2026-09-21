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
from app.models.ai_action import Lead
from app.services.wcc_service import WCCService, InsufficientWCCBalanceError
from app.services.marketing.audience_service import normalize_phone
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

        # Check if workspace has a WhatsApp line configured
        configured_tier = getattr(workspace, "meta_tier_limit", None)
        has_meta_config = bool(
            workspace and (
                (workspace.meta_access_token and (workspace.meta_phone_number_id or workspace.meta_waba_id))
                or configured_tier
            )
        )
        has_twilio_config = bool(workspace and getattr(workspace, "twilio_account_sid", None) and getattr(workspace, "twilio_phone_number", None))

        is_whatsapp_connected = False
        tier_limit = 0

        if has_meta_config:
            if workspace.meta_access_token and (workspace.meta_phone_number_id or workspace.meta_waba_id):
                cache_id = workspace.meta_phone_number_id or workspace.meta_waba_id
                cache_key = f"wa:meta_tier:{cache_id}"
                cached = None
                if redis_client:
                    try:
                        cached = redis_client.get(cache_key)
                    except Exception:
                        cached = None

                if cached:
                    try:
                        tier_limit = int(cached.decode("utf-8") if isinstance(cached, bytes) else str(cached))
                        is_whatsapp_connected = tier_limit > 0
                    except (ValueError, TypeError):
                        tier_limit = 0
                elif configured_tier:
                    # Fast path: Use tier limit already retrieved and saved during WhatsApp channel connection
                    is_whatsapp_connected = True
                    tier_limit = int(configured_tier)
                    if redis_client and tier_limit:
                        try:
                            redis_client.setex(cache_key, 3600, str(tier_limit))
                        except Exception:
                            pass
                else:
                    meta_tier = WhatsAppTierService.fetch_live_portfolio_tier(
                        waba_id=workspace.meta_waba_id,
                        access_token=workspace.meta_access_token,
                        business_id=workspace.meta_business_id,
                        phone_number_id=workspace.meta_phone_number_id
                    )
                    if meta_tier.get("is_connected"):
                        is_whatsapp_connected = True
                        tier_limit = meta_tier.get("daily_limit", 1000)
                        try:
                            workspace.meta_tier_limit = tier_limit
                            db.commit()
                        except Exception:
                            pass
                        if redis_client and tier_limit:
                            redis_client.setex(cache_key, 3600, str(tier_limit))
                    elif configured_tier:
                        # Fallback to user-configured tier limit if Meta API returns error / test mode
                        is_whatsapp_connected = True
                        tier_limit = int(configured_tier)
                    else:
                        is_whatsapp_connected = False
                        tier_limit = 0
            elif configured_tier:
                is_whatsapp_connected = True
                tier_limit = int(configured_tier)
        elif has_twilio_config:
            is_whatsapp_connected = True
            tier_limit = int(configured_tier or 1000)

        if not is_whatsapp_connected or tier_limit <= 0:
            portfolio_usage = {
                "limit": 0,
                "used": 0,
                "remaining": 0,
                "next_unlock_at": None,
            }
        else:
            portfolio_usage = WhatsAppTierService.get_portfolio_usage(
                redis_client=redis_client,
                portfolio_id=portfolio_id,
                portfolio_tier_limit=tier_limit,
                db=db,
                workspace_id=workspace_id
            )

        return {
            "estimated_cost": float(estimated_cost),
            "rate_per_message": float(rate_per_msg),
            "current_balance": float(current_balance),
            "held_balance": float(held_balance),
            "available_balance": float(available_balance),
            "is_balance_sufficient": is_sufficient,
            "shortfall": float(max(Decimal("0.00"), estimated_cost - available_balance)),
            "portfolio_tier_limit": portfolio_usage.get("limit", 0),
            "portfolio_used_today": portfolio_usage.get("used", 0),
            "portfolio_remaining_today": portfolio_usage.get("remaining", 0),
            "next_unlock_at": portfolio_usage.get("next_unlock_at"),
            "is_whatsapp_connected": is_whatsapp_connected,
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

        phone_number_id = (
            data.get("phone_number_id")
            or workspace.meta_phone_number_id
            or data.get("whatsapp_number")
            or workspace.meta_display_phone
            or "primary_whatsapp_line"
        )

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
        if raw_recipients:
            for r in raw_recipients:
                phone = r.get("phone_number") or r.get("phone") or ""
                norm = r.get("normalized_phone") or normalize_phone(phone, default_country_code="91")
                is_valid = bool(norm)
                # If skip_invalid_numbers is True, invalid numbers are skipped and excluded from dispatch
                # If skip_invalid_numbers is False, all numbers remain pending for dispatch attempt
                rec_status = "pending" if (is_valid or not campaign.skip_invalid_numbers) else "skipped"
                err_msg = None if is_valid else ("Unverified format (Will attempt dispatch)" if not campaign.skip_invalid_numbers else "Skipped (Invalid phone number)")

                recipient_objs.append(CampaignRecipient(
                    campaign_id=campaign.id,
                    workspace_id=workspace_id,
                    lead_id=r.get("lead_id"),
                    phone_number=phone,
                    normalized_phone=norm or phone,
                    recipient_name=r.get("recipient_name") or r.get("name"),
                    variables=r.get("variables") or {"name": r.get("recipient_name") or r.get("name") or "Customer"},
                    status=rec_status,
                    error_message=err_msg
                ))
            campaign.total_recipients = len(recipient_objs)
            campaign.valid_recipients = len([r for r in recipient_objs if r.status == "pending"])
            campaign.invalid_recipients = campaign.total_recipients - campaign.valid_recipients
        elif campaign.audience_source in ("existing_contacts", "all_crm_contacts", "smart_segment"):
            lead_query = db.query(Lead).filter(Lead.workspace_id == workspace_id)
            segment = data.get("segment")
            if segment == "hot":
                lead_query = lead_query.filter(Lead.score >= 70)
            elif segment == "warm":
                lead_query = lead_query.filter(Lead.score >= 40, Lead.score < 70)
            elif segment == "new":
                lead_query = lead_query.filter(Lead.status == "new")
            elif segment == "converted":
                lead_query = lead_query.filter(Lead.status == "converted")
            elif segment == "cold":
                lead_query = lead_query.filter(Lead.score < 40)

            crm_leads = lead_query.all()
            for lead in crm_leads:
                norm = normalize_phone(lead.phone, default_country_code="91")
                is_valid = bool(norm)
                rec_status = "pending" if (is_valid or not campaign.skip_invalid_numbers) else "skipped"
                err_msg = None if is_valid else ("Unverified format (Will attempt dispatch)" if not campaign.skip_invalid_numbers else "Skipped (Invalid phone number)")

                recipient_objs.append(CampaignRecipient(
                    campaign_id=campaign.id,
                    workspace_id=workspace_id,
                    lead_id=lead.id,
                    phone_number=lead.phone or "",
                    normalized_phone=norm or lead.phone or "",
                    recipient_name=lead.name or "Contact",
                    variables={"name": lead.name or "Customer", "phone": lead.phone or ""},
                    status=rec_status,
                    error_message=err_msg
                ))
            campaign.total_recipients = len(recipient_objs)
            campaign.valid_recipients = len([r for r in recipient_objs if r.status == "pending"])
            campaign.invalid_recipients = campaign.total_recipients - campaign.valid_recipients

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
        recipients_to_charge = campaign.valid_recipients if campaign.skip_invalid_numbers else campaign.total_recipients
        est = cls.calculate_preflight_estimation(
            db=db,
            workspace_id=campaign.workspace_id,
            valid_recipients_count=recipients_to_charge,
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
