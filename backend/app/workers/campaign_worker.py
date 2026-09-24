import uuid
import re
import os
import logging
import pytz
from decimal import Decimal
from datetime import datetime, timezone, time as dt_time
from typing import List, Optional
from celery import shared_task

from app.core.celery_app import celery_app
from app.database import SessionLocal
from app.models.campaign import Campaign, CampaignRecipient
from app.models.workspace import Workspace
from app.models.templates import Template
from app.services.marketing.whatsapp_tier_service import WhatsAppTierService
from app.services.marketing.outbound_gateway import (
    WhatsAppOutboundGateway,
    ORBION_SAFE_DISPATCH_MPS,
)

from app.services.config_service import config_service
from app.services.marketing.campaign_service import CampaignService
from app.services.wcc_service import WCCService
from app.core.redis_lock import get_redis_client

logger = logging.getLogger(__name__)


def is_inside_quiet_hours(tz_name: str, start_str: str = "22:00", end_str: str = "08:00") -> bool:
    try:
        tz = pytz.timezone(tz_name or "Asia/Kolkata")
        local_now = datetime.now(tz).time()

        start_h, start_m = map(int, start_str.split(":"))
        end_h, end_m = map(int, end_str.split(":"))

        start_t = dt_time(start_h, start_m)
        end_t = dt_time(end_h, end_m)

        if start_t > end_t:
            # Over midnight (e.g. 22:00 to 08:00)
            return local_now >= start_t or local_now < end_t
        else:
            return start_t <= local_now < end_t
    except Exception as exc:
        logger.error("Error evaluating quiet hours: %s", exc)
        return False


def get_quiet_hours_end_timestamp(tz_name: str, end_str: str = "08:00") -> datetime:
    tz = pytz.timezone(tz_name or "Asia/Kolkata")
    now = datetime.now(tz)
    end_h, end_m = map(int, end_str.split(":"))

    target = now.replace(hour=end_h, minute=end_m, second=0, microsecond=0)
    if now.time() >= dt_time(end_h, end_m):
        from datetime import timedelta
        target += timedelta(days=1)
    return target.astimezone(pytz.utc)


def evaluate_circuit_breaker(campaign: Campaign, db) -> bool:
    total_evaluable = (campaign.accepted_count or 0) + (campaign.failed_count or 0)
    if total_evaluable < 50:
        return False

    failure_rate = (campaign.failed_count or 0) / float(total_evaluable)
    threshold = (campaign.failure_rate_threshold or 10.0) / 100.0

    if failure_rate > threshold:
        campaign.status = "paused"
        campaign.paused_reason = f"HIGH_FAILURE_RATE ({failure_rate:.1%} failed over {total_evaluable} attempts)"
        db.commit()
        logger.warning(
            "Circuit breaker tripped for campaign %s: failure rate %.2f%% exceeded threshold %.2f%%",
            campaign.id, failure_rate * 100, threshold * 100
        )
        return True
    return False


@celery_app.task(name="app.workers.campaign_worker.orchestrate_campaign")
def orchestrate_campaign(campaign_id: str):
    db = SessionLocal()
    try:
        camp_uuid = uuid.UUID(str(campaign_id)) if isinstance(campaign_id, str) else campaign_id
        campaign = db.query(Campaign).filter(Campaign.id == camp_uuid).first()
        if not campaign or campaign.status in ("paused", "cancelled", "completed"):
            return

        # Fetch all pending or held recipients
        recipients = db.query(CampaignRecipient).filter(
            CampaignRecipient.campaign_id == campaign.id,
            CampaignRecipient.status.in_(("pending", "held_portfolio_limit"))
        ).order_by(CampaignRecipient.created_at.asc()).all()

        if not recipients:
            campaign.status = "completed"
            campaign.completed_at = datetime.now(timezone.utc)
            # Release remaining unconsumed escrow
            unspent = max(Decimal("0.00"), Decimal(str(campaign.held_cost)) - Decimal(str(campaign.actual_cost)))
            if unspent > Decimal("0.00"):
                CampaignService.release_unspent_escrow(db, campaign.workspace_id, unspent)
                campaign.held_cost = campaign.actual_cost
            db.commit()
            return

        recipient_ids = [str(r.id) for r in recipients]
        chunk_size = 50

        # Calculate macro interval
        if campaign.send_gradually and campaign.messages_per_minute > 0:
            msgs_per_sec = campaign.messages_per_minute / 60.0
            interval_sec = max(0.5, chunk_size / msgs_per_sec)
        else:
            # Safe default 40 msg/sec
            interval_sec = max(0.25, chunk_size / float(ORBION_SAFE_DISPATCH_MPS))

        for idx, i in enumerate(range(0, len(recipient_ids), chunk_size)):
            chunk = recipient_ids[i:i + chunk_size]
            countdown = int(idx * interval_sec)
            send_campaign_chunk.apply_async(
                args=[campaign_id, chunk],
                countdown=countdown,
            )

        logger.info(
            "Campaign %s orchestrated into %s chunks with interval %.2fs",
            campaign_id, (len(recipient_ids) + chunk_size - 1) // chunk_size, interval_sec
        )
    except Exception as exc:
        logger.error("Error orchestrating campaign %s: %s", campaign_id, exc)
    finally:
        db.close()


@celery_app.task(name="app.workers.campaign_worker.send_campaign_chunk")
def send_campaign_chunk(campaign_id: str, recipient_ids: List[str]):
    camp_uuid = uuid.UUID(str(campaign_id)) if isinstance(campaign_id, (str, uuid.UUID)) else campaign_id
    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == camp_uuid).first()
        if not campaign or campaign.status in ("paused", "cancelled", "completed"):
            logger.info("Chunk exiting: campaign %s is in status %s", campaign_id, getattr(campaign, "status", None))
            return

        # 1. Quiet Hours check
        if campaign.quiet_hours_enabled:
            if is_inside_quiet_hours(campaign.timezone, campaign.quiet_hours_start, campaign.quiet_hours_end):
                wake_dt = get_quiet_hours_end_timestamp(campaign.timezone, campaign.quiet_hours_end)
                delay_sec = max(60, int((wake_dt - datetime.now(timezone.utc)).total_seconds()))
                logger.info("Quiet hours active for campaign %s. Postponing chunk for %s seconds", campaign_id, delay_sec)
                send_campaign_chunk.apply_async(args=[campaign_id, recipient_ids], countdown=delay_sec)
                return

        # 2. Circuit Breaker check
        if campaign.stop_on_high_failure_rate and evaluate_circuit_breaker(campaign, db):
            return

     
        workspace = db.query(Workspace).filter(Workspace.id == campaign.workspace_id).first()
        access_token = (
            config_service.get("meta_system_user_token")
            or os.getenv("META_SYSTEM_USER_TOKEN")
            or (workspace.meta_access_token if workspace else None)
        )

        if not workspace or not access_token:
            logger.error("Workspace or Meta access token missing for campaign %s", campaign_id)
            campaign.status = "paused"
            campaign.paused_reason = "META_ACCESS_TOKEN_MISSING"
            db.commit()
            return

        portfolio_id = campaign.portfolio_id or workspace.meta_business_id or workspace.meta_waba_id or str(workspace.id)
        phone_number_id = workspace.meta_phone_number_id or campaign.phone_number_id

        # Load Template if template campaign
        template = None
        if campaign.template_id:
            tmpl_uuid = uuid.UUID(str(campaign.template_id)) if isinstance(campaign.template_id, (str, uuid.UUID)) else campaign.template_id
            template = db.query(Template).filter(Template.id == tmpl_uuid).first()

        redis_client = None
        try:
            redis_client = get_redis_client()
        except Exception:
            pass

        tier_limit = 0
        cache_id = workspace.meta_phone_number_id or workspace.meta_waba_id
        if cache_id and redis_client:
            try:
                cached = redis_client.get(f"wa:meta_tier:{cache_id}")
                if cached:
                    tier_limit = int(cached.decode("utf-8") if isinstance(cached, bytes) else str(cached))
            except Exception:
                pass

        if not tier_limit and getattr(workspace, "meta_tier_limit", None):
            tier_limit = int(workspace.meta_tier_limit)
        elif WhatsAppOutboundGateway._test_provider is not None:
            tier_limit = 1000

        if not tier_limit and access_token and (workspace.meta_phone_number_id or workspace.meta_waba_id):
            try:
                meta_tier = WhatsAppTierService.fetch_live_portfolio_tier(
                    waba_id=workspace.meta_waba_id,
                    access_token=access_token,
                    business_id=workspace.meta_business_id,
                    phone_number_id=workspace.meta_phone_number_id,
                )
                if meta_tier.get("is_connected"):
                    tier_limit = meta_tier.get("daily_limit", 1000)
                    if redis_client and cache_id:
                        redis_client.setex(f"wa:meta_tier:{cache_id}", 3600, str(tier_limit))
            except Exception as e:
                logger.warning("Failed to fetch live tier in worker: %s", e)

        campaign_cat = "marketing"
        if template and getattr(template, "category", None):
            campaign_cat = str(template.category).lower()
        elif campaign.campaign_type:
            campaign_cat = str(campaign.campaign_type).lower()

        rate_card = WCCService.get_active_rate(db, campaign_cat, "IN")
        rate_per_msg = (
            Decimal(str(rate_card.customer_price))
            if rate_card and rate_card.customer_price is not None
            else (
                Decimal(str(campaign.estimated_cost or "0.00")) / Decimal(str(max(1, campaign.valid_recipients)))
                if campaign.estimated_cost and campaign.valid_recipients
                else Decimal("1.25")
            )
        )

        for r_id in recipient_ids:
            # Re-check campaign status before sending each message
            if campaign.status in ("paused", "cancelled"):
                break

            r_uuid = uuid.UUID(str(r_id)) if isinstance(r_id, (str, uuid.UUID)) else r_id
            recipient = db.query(CampaignRecipient).filter(CampaignRecipient.id == r_uuid).first()
            if not recipient or recipient.status in ("accepted", "sent", "delivered", "read", "cancelled"):
                continue

            # 3. Portfolio Quota Check via Atomic Lua
            allowed, wake_up_ts = WhatsAppTierService.check_and_register_recipient(
                redis_client=redis_client,
                portfolio_id=portfolio_id,
                recipient_normalized_phone=recipient.normalized_phone,
                portfolio_tier_limit=tier_limit,
                rolling_window_seconds=86400
            )

            if not allowed:
                # Portfolio Quota Exhausted!
                recipient.status = "held_portfolio_limit"
                campaign.status = "paused"
                campaign.paused_reason = "PORTFOLIO_TIER_LIMIT_REACHED"
                if wake_up_ts:
                    campaign.next_available_capacity_at = datetime.fromtimestamp(wake_up_ts, tz=timezone.utc)
                    resume_delay = max(5, int(wake_up_ts - datetime.now(timezone.utc).timestamp()))
                    orchestrate_campaign.apply_async(args=[campaign_id], countdown=resume_delay)
                    logger.warning(
                        "[Campaign %s] Portfolio tier limit hit (%s/day) for portfolio %s. Recipient %s paused. Auto-scheduled wake up in %s seconds",
                        campaign_id, tier_limit, portfolio_id, recipient.normalized_phone, resume_delay
                    )
                else:
                    logger.warning(
                        "[Campaign %s] Portfolio tier limit hit (%s/day) for portfolio %s. Recipient %s paused.",
                        campaign_id, tier_limit, portfolio_id, recipient.normalized_phone
                    )
                db.commit()
                return

            recipient.status = "queued"

            # 4. Construct Payload
            clean_phone = recipient.normalized_phone.replace("+", "").strip()
            if template:
                # Form Meta Template payload
                components = []
                body_params = []
                vars_dict = recipient.variables or {}

                # 1. Header component (Media or text variables)
                tmpl_type = (template.type or "TEXT").upper()
                if tmpl_type in ("IMAGE", "VIDEO", "DOCUMENT"):
                    media_type = tmpl_type.lower()
                    media_url = (
                        campaign.media_url
                        or getattr(template, "media_url", None)
                        or (template.header if template.header and (template.header.startswith("http://") or template.header.startswith("https://")) else None)
                    )
                    if not media_url:
                        if tmpl_type == "IMAGE":
                            media_url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
                        elif tmpl_type == "VIDEO":
                            media_url = "https://www.w3schools.com/html/mov_bbb.mp4"
                        elif tmpl_type == "DOCUMENT":
                            media_url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

                    components.append({
                        "type": "header",
                        "parameters": [{
                            "type": media_type,
                            media_type: {"link": media_url}
                        }]
                    })
                elif template.header and not template.header.startswith("4:"):
                    header_indices = re.findall(r"\{\{(\d+)\}\}", template.header)
                    if header_indices:
                        h_params = []
                        for h_idx in header_indices:
                            h_val = vars_dict.get(f"header_{h_idx}") or vars_dict.get(h_idx) or recipient.recipient_name or "Customer"
                            h_params.append({"type": "text", "text": str(h_val)})
                        components.append({
                            "type": "header",
                            "parameters": h_params
                        })

                # 2. Body parameters
                # Extract only the exact placeholder indices expected by the template (e.g. ['1', '2'])
                body_text = template.content or ""
                expected_indices = re.findall(r"\{\{(\d+)\}\}", body_text)

                if expected_indices:
                    # Deduplicate in occurrence order (1, 2, 3...)
                    seen = set()
                    ordered_indices = [x for x in expected_indices if not (x in seen or seen.add(x))]

                    for idx in ordered_indices:
                        val = vars_dict.get(idx) or vars_dict.get(f"{{{{{idx}}}}}") or vars_dict.get(f"var_{idx}") or ""
                        # Graceful fallback for {{1}} if name was mapped or available
                        if not val and idx == "1":
                            val = recipient.recipient_name or vars_dict.get("name") or "Customer"
                        body_params.append({"type": "text", "text": str(val or "Customer")})
                else:
                    # If template doesn't use standard {{1}} format, only send numeric keys
                    numeric_keys = sorted(
                        [k for k in vars_dict.keys() if str(k).replace("{", "").replace("}", "").strip().isdigit()],
                        key=lambda k: int(str(k).replace("{", "").replace("}", "").strip())
                    )
                    for k in numeric_keys:
                        body_params.append({"type": "text", "text": str(vars_dict[k])})

                if body_params:
                    components.append({
                        "type": "body",
                        "parameters": body_params
                    })

                template_payload = {
                    "name": template.name,
                    "language": {"code": template.language or "en_US"},
                }
                if components:
                    template_payload["components"] = components

                payload = {
                    "messaging_product": "whatsapp",
                    "to": clean_phone,
                    "type": "template",
                    "template": template_payload,
                }
            else:
                # Custom text or media payload
                text_body = campaign.message_content or "Hello"
                # Substitute variables like {{name}}
                for k, v in (recipient.variables or {}).items():
                    text_body = text_body.replace(f"{{{{{k}}}}}", str(v))

                if campaign.media_url and campaign.media_type in ("image", "video", "document"):
                    payload = {
                        "messaging_product": "whatsapp",
                        "to": clean_phone,
                        "type": campaign.media_type,
                        campaign.media_type: {
                            "link": campaign.media_url,
                            "caption": text_body
                        }
                    }
                else:
                    payload = {
                        "messaging_product": "whatsapp",
                        "to": clean_phone,
                        "type": "text",
                        "text": {"body": text_body}
                    }

            # 5. Dispatch via Outbound Gateway (40 MPS Token Bucket)
            target_mps = ORBION_SAFE_DISPATCH_MPS
            if campaign.send_gradually and campaign.messages_per_minute > 0:
                target_mps = max(1, min(ORBION_SAFE_DISPATCH_MPS, int(campaign.messages_per_minute / 60.0)))

            res = WhatsAppOutboundGateway.send_meta_message(
                access_token=access_token,
                phone_number_id=phone_number_id,
                payload=payload,
                redis_client=redis_client,
                target_mps=target_mps
            )

            # 6. Process Gateway Response
            now_dt = datetime.now(timezone.utc)
            if res.get("success"):
                recipient.status = "accepted"
                recipient.wamid = res.get("wamid")
                recipient.accepted_at = now_dt
                recipient.cost = rate_per_msg
                campaign.accepted_count = (campaign.accepted_count or 0) + 1
                campaign.actual_cost = Decimal(str(campaign.actual_cost or "0.00")) + rate_per_msg

                # Shift escrow from held to deducted
                CampaignService.settle_message_cost(db, campaign.workspace_id, rate_per_msg)

                logger.info(
                    "[Campaign %s] Message ACCEPTED for recipient %s (%s) | wamid=%s",
                    campaign.id, recipient.id, clean_phone, res.get("wamid")
                )
            elif res.get("is_marketing_frequency_limit"):
                # Meta Error 131049: Circuit Breaker Immune
                recipient.status = "skipped_marketing_frequency_limit"
                recipient.error_code = "131049"
                recipient.error_message = res.get("error_message")
                campaign.skipped_marketing_cap_count = (campaign.skipped_marketing_cap_count or 0) + 1

                # Instant Escrow Refund
                CampaignService.release_unspent_escrow(db, campaign.workspace_id, rate_per_msg)

                logger.warning(
                    "[Campaign %s] Recipient %s (%s) SKIPPED (Marketing Frequency Cap 131049): "
                    "subcode=%s | msg=%s | fbtrace_id=%s",
                    campaign.id, recipient.id, clean_phone,
                    res.get("error_subcode"), res.get("error_message"), res.get("fbtrace_id")
                )
            else:
                # Other delivery failure
                recipient.status = "failed"
                err_code = str(res.get("error_code") or "FAILED")
                err_msg = str(res.get("error_message") or "Unknown error")
                err_details = res.get("error_details")
                recipient.error_code = err_code
                recipient.error_message = f"{err_msg}: {err_details}" if err_details else err_msg
                campaign.failed_count = (campaign.failed_count or 0) + 1

                # Refund unused escrow for failed attempt
                CampaignService.release_unspent_escrow(db, campaign.workspace_id, rate_per_msg)

                logger.error(
                    "[Campaign %s] Recipient %s (%s) FAILED: code=%s | subcode=%s | msg=%s | details=%s | fbtrace_id=%s",
                    campaign.id, recipient.id, clean_phone,
                    err_code, res.get("error_subcode"), err_msg, err_details, res.get("fbtrace_id")
                )

                if campaign.stop_on_high_failure_rate and evaluate_circuit_breaker(campaign, db):
                    logger.error(
                        "[Campaign %s] Circuit breaker tripped! Aborting remaining chunk processing.",
                        campaign.id
                    )
                    break

        db.commit()

        # Check if entire campaign finished
        remaining = db.query(CampaignRecipient).filter(
            CampaignRecipient.campaign_id == campaign.id,
            CampaignRecipient.status.in_(("pending", "queued"))
        ).count()
        if remaining == 0 and campaign.status == "in_progress":
            campaign.status = "completed"
            campaign.completed_at = datetime.now(timezone.utc)
            unspent = max(Decimal("0.00"), Decimal(str(campaign.held_cost)) - Decimal(str(campaign.actual_cost)))
            if unspent > Decimal("0.00"):
                CampaignService.release_unspent_escrow(db, campaign.workspace_id, unspent)
                campaign.held_cost = campaign.actual_cost
            db.commit()

    except Exception as exc:
        logger.error("Error processing send_campaign_chunk for campaign %s: %s", campaign_id, exc)
    finally:
        db.close()


@celery_app.task(name="app.workers.campaign_worker.check_scheduled_campaigns")
def check_scheduled_campaigns():
    db = SessionLocal()
    try:
        now_utc = datetime.now(timezone.utc)
        scheduled = (
            db.query(Campaign)
            .filter(
                Campaign.status == "scheduled",
                Campaign.scheduled_at <= now_utc
            )
            .with_for_update(skip_locked=True)
            .all()
        )
        for camp in scheduled:
            logger.info("Triggering scheduled campaign %s (scheduled at %s)", camp.id, camp.scheduled_at)
            camp.status = "in_progress"
            camp.started_at = now_utc
            db.commit()
            orchestrate_campaign.delay(str(camp.id))
    except Exception as exc:
        logger.error("Error in check_scheduled_campaigns: %s", exc)
        db.rollback()
    finally:
        db.close()

