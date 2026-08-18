import logging
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import Dict, Any
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.core.celery_app import celery_app
from app.models.email_delivery_log import EmailDeliveryLog
from app.models.ai_action import Lead
from app.models.conversation import Conversation, ConversationStatus
from app.models.workspace import Workspace, WorkspaceMember
from app.models.subscription import Subscription
from app.models.billing import Payment
from app.core.enums import PaymentStatus, SubscriptionStatus
from app.core.event_bus import emit_event
from app.services.notifications.notification_rule_engine import NotificationRuleEngine

from app.models.notification_schedule import NotificationSchedule
from app.services.notifications.schedule_service import NotificationScheduleService
from app.models.user import User

logger = logging.getLogger("auromind")


@celery_app.task(name="app.workers.notification_scheduler_worker.evaluate_dynamic_notification_schedules")
def evaluate_dynamic_notification_schedules():
    
    db: Session = SessionLocal()
    now_utc = datetime.now(timezone.utc)

    try:
        due_schedules = (
            db.query(NotificationSchedule)
            .filter(
                NotificationSchedule.is_active == True,
                or_(
                    NotificationSchedule.next_run_at.is_(None),
                    NotificationSchedule.next_run_at <= now_utc
                )
            )
            .with_for_update(skip_locked=True)
            .all()
        )

        for sched in due_schedules:
            try:
                event_name = sched.event_name
                display_name = sched.display_name

                # Advance next_run_at and commit first to prevent race conditions
                sched.last_run_at = now_utc
                sched.next_run_at = NotificationScheduleService.calculate_next_run(sched, now_utc)
                db.commit()

                # Dispatch corresponding handler
                if event_name == "report.daily_summary":
                    generate_daily_dashboard_summary()
                elif event_name == "report.weekly_performance":
                    generate_weekly_performance_report()
                elif event_name in ["onboarding.milestones", "trial.milestones"]:
                    check_onboarding_and_payment_milestones()
                elif event_name == "lead.inactive_scan":
                    check_inactive_leads()
                elif event_name == "lead.sla_scan":
                    check_lead_sla_breaches()

                logger.info(f"[DynamicScheduler] Executed schedule '{display_name}'. Next run at {sched.next_run_at}.")
            except Exception as e:
                logger.error(f"[DynamicScheduler] Error executing schedule {sched.id if hasattr(sched, 'id') else 'unknown'}: {e}", exc_info=True)
    except Exception as exc:
        logger.error(f"[DynamicScheduler] Schedule evaluation query failed: {exc}", exc_info=True)
    finally:
        db.close()


@celery_app.task(name="app.workers.notification_scheduler_worker.process_scheduled_email_outbox")
def process_scheduled_email_outbox():
    db: Session = SessionLocal()
    now_utc = datetime.now(timezone.utc)
    processed_count = 0

    try:
        # Select pending / retrying logs using SELECT FOR UPDATE SKIP LOCKED
        logs = (
            db.query(EmailDeliveryLog)
            .filter(
                EmailDeliveryLog.status.in_(["PENDING", "RETRYING"]),
                or_(
                    EmailDeliveryLog.scheduled_for.is_(None),
                    EmailDeliveryLog.scheduled_for <= now_utc
                ),
                EmailDeliveryLog.attempts < EmailDeliveryLog.max_attempts
            )
            .order_by(EmailDeliveryLog.created_at.asc())
            .with_for_update(skip_locked=True)
            .limit(50)
            .all()
        )

        for log in logs:
            try:
                NotificationRuleEngine.dispatch_single_log(db, log.id)
                processed_count += 1
            except Exception as e:
                logger.error(f"[OutboxProcessor] Error dispatching log {log.id}: {e}")

        if processed_count > 0:
            logger.info(f"[OutboxProcessor] Processed {processed_count} outbox email(s).")
    except Exception as exc:
        logger.error(f"[OutboxProcessor] Outbox polling failed: {exc}", exc_info=True)
    finally:
        db.close()


@celery_app.task(name="app.workers.notification_scheduler_worker.check_lead_sla_breaches")
def check_lead_sla_breaches():
    db: Session = SessionLocal()
    now_utc = datetime.now(timezone.utc)
    sla_cutoff = now_utc - timedelta(minutes=15)
    recent_window = now_utc - timedelta(hours=4)

    try:
        unreplied_leads = (
            db.query(Lead)
            .join(Conversation, Lead.conversation_id == Conversation.id)
            .filter(
                Lead.status == "new",
                Lead.created_at <= sla_cutoff,
                Lead.created_at >= recent_window,
                Conversation.status == ConversationStatus.OPEN
            )
            .all()
        )

        for lead in unreplied_leads:
            created_at = lead.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)

            waiting_mins = max(15, int((now_utc - created_at).total_seconds() // 60))
            idemp = f"sla:{lead.id}:{created_at.strftime('%Y%m%d%H')}"

            emit_event(
                event_name="lead.sla_breached",
                payload={
                    "lead_id": str(lead.id),
                    "lead_name": lead.name or lead.phone or "New Lead",
                    "lead_phone": lead.phone or "N/A",
                    "assigned_to": str(lead.assigned_to) if lead.assigned_to else None,
                    "waiting_time_mins": waiting_mins,
                    "action_route": f"/inbox?conversation_id={lead.conversation_id}",
                    "workspace_id": str(lead.workspace_id)
                },
                workspace_id=lead.workspace_id,
                idempotency_key=idemp,
                db=db
            )
    except Exception as exc:
        logger.error(f"[SLAChecker] Error checking SLA breaches: {exc}", exc_info=True)
    finally:
        db.close()


@celery_app.task(name="app.workers.notification_scheduler_worker.check_inactive_leads")
def check_inactive_leads():
    db: Session = SessionLocal()
    now_utc = datetime.now(timezone.utc)
    today_str = now_utc.strftime("%Y%m%d")

    try:
        # Check active leads with no recent activity
        leads = (
            db.query(Lead)
            .filter(
                Lead.is_converted == False,
                Lead.status.in_(["new", "active"]),
                Lead.last_activity_at.isnot(None)
            )
            .all()
        )

        for lead in leads:
            last_act = lead.last_activity_at
            if last_act.tzinfo is None:
                last_act = last_act.replace(tzinfo=timezone.utc)

            days_inactive = (now_utc - last_act).days
            if days_inactive in (1, 3, 7):
                idemp = f"inactive:{lead.id}:{days_inactive}d:{today_str}"
                suggested_action = "Send a WhatsApp follow-up message" if days_inactive <= 3 else "Offer a special demo or discount"

                emit_event(
                    event_name="lead.inactive_reminder",
                    payload={
                        "lead_id": str(lead.id),
                        "lead_name": lead.name or lead.phone or "Lead",
                        "days_inactive": days_inactive,
                        "suggested_action": suggested_action,
                        "assigned_to": str(lead.assigned_to) if lead.assigned_to else None,
                        "action_route": f"/crm/leads",
                        "workspace_id": str(lead.workspace_id)
                    },
                    workspace_id=lead.workspace_id,
                    idempotency_key=idemp,
                    db=db
                )
    except Exception as exc:
        logger.error(f"[InactiveLeadChecker] Error: {exc}", exc_info=True)
    finally:
        db.close()


@celery_app.task(name="app.workers.notification_scheduler_worker.check_onboarding_and_payment_milestones")
def check_onboarding_and_payment_milestones():

    db: Session = SessionLocal()
    now_utc = datetime.now(timezone.utc)
    today_str = now_utc.strftime("%Y%m%d")

    try:
        # 1. Onboarding Inactivity (1-2 days inactive)
        inactivity_start = now_utc - timedelta(days=2)
        inactivity_end = now_utc - timedelta(days=1)
        new_workspaces = (
            db.query(Workspace)
            .filter(
                Workspace.created_at <= inactivity_end,
                Workspace.created_at >= inactivity_start
            )
            .all()
        )

        for ws in new_workspaces:
            # Check if any conversations exist
            conv_count = db.query(func.count(Conversation.id)).filter(Conversation.workspace_id == ws.id).scalar() or 0
            if conv_count == 0:
                emit_event(
                    event_name="onboarding.inactivity_reminder",
                    payload={
                        "workspace_name": ws.name,
                        "setup_guide_url": "/settings/channels",
                        "action_url": "/automation/workflows",
                        "workspace_id": str(ws.id)
                    },
                    workspace_id=ws.id,
                    idempotency_key=f"onboarding_inact:{ws.id}:{today_str}",
                    db=db
                )

        # 2. Failed Payments (24h and 72h reminders)
        failed_payments = (
            db.query(Payment)
            .filter(
                Payment.status == PaymentStatus.failed,
                Payment.created_at >= now_utc - timedelta(days=4)
            )
            .all()
        )

        for p in failed_payments:
            p_time = p.created_at
            if p_time.tzinfo is None:
                p_time = p_time.replace(tzinfo=timezone.utc)
            hours_since_fail = int((now_utc - p_time).total_seconds() // 3600)

            if 24 <= hours_since_fail < 30:
                impact_date = (p_time + timedelta(days=3)).strftime("%B %d, %Y")
                emit_event(
                    event_name="payment.failed_reminder_24h",
                    payload={
                        "amount": f"{p.amount} {p.currency}",
                        "service_impact_date": impact_date,
                        "workspace_id": str(p.workspace_id)
                    },
                    workspace_id=p.workspace_id,
                    idempotency_key=f"pay_fail_24h:{p.id}",
                    db=db
                )
            elif 72 <= hours_since_fail < 78:
                cutoff_date = (p_time + timedelta(days=4)).strftime("%B %d, %Y")
                emit_event(
                    event_name="payment.failed_reminder_72h",
                    payload={
                        "amount": f"{p.amount} {p.currency}",
                        "service_cutoff_date": cutoff_date,
                        "workspace_id": str(p.workspace_id)
                    },
                    workspace_id=p.workspace_id,
                    idempotency_key=f"pay_fail_72h:{p.id}",
                    db=db
                )

        # 3. Unverified Users (24h Reminder)
        unverified_cutoff_start = now_utc - timedelta(hours=36)
        unverified_cutoff_end = now_utc - timedelta(hours=24)
        unverified_users = (
            db.query(User)
            .filter(
                User.created_at <= unverified_cutoff_end,
                User.created_at >= unverified_cutoff_start
            )
            .all()
        )
        for u in unverified_users:
            emit_event(
                event_name="user.verification_reminder_24h",
                payload={
                    "email": u.email,
                    "user_name": u.full_name or u.email.split("@")[0].title(),
                    "verification_url": f"/verify-otp?email={u.email}",
                    "action_route": "/verify-otp",
                    "action_label": "Complete Verification"
                },
                actor_id=u.id,
                idempotency_key=f"verify_remind_24h:{u.id}:{today_str}",
                db=db
            )
    except Exception as exc:
        logger.error(f"[MilestoneChecker] Error: {exc}", exc_info=True)
    finally:
        db.close()


@celery_app.task(name="app.workers.notification_scheduler_worker.generate_daily_dashboard_summary")
def generate_daily_dashboard_summary():
    
    db: Session = SessionLocal()
    now_utc = datetime.now(timezone.utc)
    yesterday = now_utc - timedelta(days=1)
    today_str = now_utc.strftime("%B %d, %Y")
    idemp_date = now_utc.strftime("%Y%m%d")

    try:
        workspaces = db.query(Workspace).all()
        for ws in workspaces:
            # Resolve workspace-specific timezone
            ws_tz_str = NotificationScheduleService.get_workspace_timezone(ws)
            try:
                ws_tz = ZoneInfo(ws_tz_str)
            except Exception:
                ws_tz = ZoneInfo("Asia/Kolkata")

            ws_local_now = now_utc.astimezone(ws_tz)
            today_str = ws_local_now.strftime("%B %d, %Y")
            idemp_date = ws_local_now.strftime("%Y%m%d")

            # 1. New leads count
            new_leads = db.query(func.count(Lead.id)).filter(
                Lead.workspace_id == ws.id,
                Lead.created_at >= yesterday
            ).scalar() or 0

            # 2. Conversions count
            conversions = db.query(func.count(Lead.id)).filter(
                Lead.workspace_id == ws.id,
                Lead.is_converted == True,
                Lead.converted_at >= yesterday
            ).scalar() or 0

            # 3. Revenue
            revenue_sum = db.query(func.sum(Lead.conversion_amount)).filter(
                Lead.workspace_id == ws.id,
                Lead.is_converted == True,
                Lead.converted_at >= yesterday
            ).scalar() or 0

            # 4. Unanswered messages
            unanswered = db.query(func.count(Conversation.id)).filter(
                Conversation.workspace_id == ws.id,
                Conversation.status == ConversationStatus.OPEN
            ).scalar() or 0

            # 5. Remaining credit balance
            from app.models.token_ledger import TokenLedger
            credit_balance = db.query(func.sum(TokenLedger.credits_delta)).filter(
                TokenLedger.workspace_id == ws.id
            ).scalar() or 0

            emit_event(
                event_name="report.daily_summary",
                payload={
                    "date": today_str,
                    "new_leads": new_leads,
                    "conversions": conversions,
                    "revenue": f"₹{revenue_sum:,.2f}" if revenue_sum else "₹0.00",
                    "unanswered_messages": unanswered,
                    "credit_balance": f"{credit_balance:,.0f}",
                    "workspace_id": str(ws.id)
                },
                workspace_id=ws.id,
                idempotency_key=f"daily_summary:{ws.id}:{idemp_date}",
                db=db
            )
    except Exception as exc:
        logger.error(f"[DailySummaryReport] Error: {exc}", exc_info=True)
    finally:
        db.close()


@celery_app.task(name="app.workers.notification_scheduler_worker.generate_weekly_performance_report")
def generate_weekly_performance_report():
    
    db: Session = SessionLocal()
    now_utc = datetime.now(timezone.utc)
    week_ago = now_utc - timedelta(days=7)

    try:
        workspaces = db.query(Workspace).all()
        for ws in workspaces:
            ws_tz_str = NotificationScheduleService.get_workspace_timezone(ws)
            try:
                ws_tz = ZoneInfo(ws_tz_str)
            except Exception:
                ws_tz = ZoneInfo("Asia/Kolkata")

            ws_local_now = now_utc.astimezone(ws_tz)
            idemp_week = ws_local_now.strftime("%Y_W%W")
            week_range = f"{(ws_local_now - timedelta(days=7)).strftime('%b %d')} - {ws_local_now.strftime('%b %d, %Y')}"

            total_leads = db.query(func.count(Lead.id)).filter(
                Lead.workspace_id == ws.id,
                Lead.created_at >= week_ago
            ).scalar() or 0

            conversions = db.query(func.count(Lead.id)).filter(
                Lead.workspace_id == ws.id,
                Lead.is_converted == True,
                Lead.converted_at >= week_ago
            ).scalar() or 0

            conv_rate = (conversions / total_leads * 100) if total_leads > 0 else 0
            funnel_stats = f"{total_leads} leads captured, {conversions} converted ({conv_rate:.1f}% rate)"

            emit_event(
                event_name="report.weekly_performance",
                payload={
                    "week_range": week_range,
                    "funnel_stats": funnel_stats,
                    "top_agents": "Active sales agents",
                    "active_workflows": "Automated WhatsApp flows",
                    "workspace_id": str(ws.id)
                },
                workspace_id=ws.id,
                idempotency_key=f"weekly_report:{ws.id}:{idemp_week}",
                db=db
            )
    except Exception as exc:
        logger.error(f"[WeeklyPerformanceReport] Error: {exc}", exc_info=True)
    finally:
        db.close()


# Compatibility alias
check_trial_and_payment_milestones = check_onboarding_and_payment_milestones
