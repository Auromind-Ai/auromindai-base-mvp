import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.notification_rule import NotificationRule
from app.models.email_delivery_log import EmailDeliveryLog
from app.models.notification import Notification
from app.models.workspace import Workspace
from app.core.security import to_uuid
from app.core.config import settings
from app.services.notifications.recipient_resolver import RecipientResolver, ResolvedRecipient
from app.services.notification_template_service import (
    NotificationTemplateService,
    NotificationRegistry
)
from app.workers.email_retry_worker import send_email_with_retry

logger = logging.getLogger("app")


class NotificationRuleEngine:
  

    @classmethod
    def process_event(
        cls,
        db: Session,
        event_name: str,
        payload: Dict[str, Any],
        workspace_id: Optional[uuid.UUID] = None,
        actor_id: Optional[uuid.UUID] = None,
        idempotency_key: Optional[str] = None,
        dispatch_immediately: bool = True
    ) -> List[EmailDeliveryLog]:
        ws_id = to_uuid(workspace_id) or to_uuid(payload.get("workspace_id"))
        created_logs: List[EmailDeliveryLog] = []

        # 1. Fetch matching active rules from DB
        rules = db.query(NotificationRule).filter(
            NotificationRule.event_name == event_name,
            NotificationRule.is_active == True
        ).all()

        if not rules:
            logger.debug(f"No active notification rules found for event: {event_name}")
            return []

        # Workspace name lookup
        ws_name = payload.get("workspace_name") or "Orbion Agents"
        if ws_id and ws_name == "Orbion Agents":
            ws = db.query(Workspace).filter(Workspace.id == ws_id).first()
            if ws and ws.name:
                ws_name = ws.name

        base_app_url = (getattr(settings, "FRONTEND_URL", None) or "http://localhost:3000").rstrip("/")
        app_name = getattr(settings, "APP_NAME", "orbionagents") or "orbionagents"

        for rule in rules:
            # 2. Evaluate condition filters
            if not cls._evaluate_conditions(rule.conditions, payload):
                logger.info(f"Rule condition not met for event {event_name} (template {rule.template_key})")
                continue

            # 3. Resolve dynamic recipients
            is_critical = payload.get("is_critical", False) or event_name.startswith("security.") or event_name == "payment.failed"
            recipients = RecipientResolver.resolve_recipients(
                db=db,
                recipient_roles=rule.recipient_roles,
                workspace_id=ws_id,
                event_data=payload,
                event_name=event_name,
                is_critical=is_critical
            )

            if not recipients:
                logger.debug(f"No recipients resolved for rule {rule.event_name} -> {rule.template_key}")
                continue

            # 4. Fetch template
            tpl = NotificationTemplateService.get_template(db, rule.template_key)
            if not tpl:
                logger.warning(f"Template not found for key: {rule.template_key}")
                continue

            from app.services.notifications.event_registry_service import build_action_url

            reg_meta = NotificationRegistry.get_metadata(rule.template_key) or {}
            action_route = payload.get("action_route") or reg_meta.get("action_route", "/dashboard")
            action_label = payload.get("action_label") or reg_meta.get("action_label", "Open Application")
            action_url = payload.get("action_url") or build_action_url(action_route, base_app_url)

            for rec in recipients:
                # 5. Build context dictionary per recipient
                context = {
                    "app_name": app_name,
                    "workspace_name": ws_name,
                    "frontend_url": base_app_url,
                    "action_url": action_url,
                    "action_label": action_label,
                    "user_name": rec.name,
                    "email": rec.email,
                }
                context.update(payload)

                # Render fields
                rendered_title = NotificationTemplateService.render_text(tpl.get("title") or tpl.get("name") or "Notification", context)
                rendered_subject = NotificationTemplateService.render_text(tpl.get("subject") or f"[{ws_name}] {rendered_title}", context)
                rendered_message = NotificationTemplateService.render_text(tpl.get("message") or "", context)

                rendered_html = NotificationTemplateService.render_html_email(
                    title=rendered_title,
                    message=rendered_message,
                    context=context,
                    action_url=action_url,
                    action_label=action_label,
                    app_name=app_name
                )

                # 6. Deterministic Idempotency Key
                base_idemp = idempotency_key or f"evt:{event_name}:{ws_id or 'global'}:{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
                recipient_idemp = f"{base_idemp}:{rule.template_key}:{rec.email}"

                # Check if already staged / sent
                existing_log = db.query(EmailDeliveryLog).filter(
                    EmailDeliveryLog.idempotency_key == recipient_idemp
                ).first()

                if existing_log:
                    logger.info(f"Duplicate email prevented by idempotency key: {recipient_idemp}")
                    continue

                scheduled_for = None
                if rule.delay_minutes > 0:
                    scheduled_for = datetime.now(timezone.utc) + timedelta(minutes=rule.delay_minutes)

                # 7. Create EmailDeliveryLog record (Transactional Outbox)
                delivery_log = EmailDeliveryLog(
                    id=uuid.uuid4(),
                    idempotency_key=recipient_idemp,
                    workspace_id=ws_id,
                    recipient_email=rec.email,
                    recipient_name=rec.name,
                    recipient_role=rec.role,
                    event_name=event_name,
                    template_key=rule.template_key,
                    subject=rendered_subject,
                    body_html=rendered_html,
                    status="PENDING",
                    attempts=0,
                    max_attempts=3,
                    metadata_json=payload,
                    scheduled_for=scheduled_for
                )
                db.add(delivery_log)
                created_logs.append(delivery_log)

                # 8. Create in-app notification if channel includes in_app and user_id is present
                channels = rule.channels or ["email"]
                if ("in_app" in channels or "both" in channels) and rec.user_id:
                    in_app_notif = Notification(
                        id=uuid.uuid4(),
                        user_id=rec.user_id,
                        workspace_id=ws_id,
                        type=event_name.replace(".", "_"),
                        title=rendered_title,
                        message=rendered_message,
                        is_read=False
                    )
                    db.add(in_app_notif)

        # Commit outbox logs to database
        if created_logs:
            try:
                db.commit()
                for log in created_logs:
                    db.refresh(log)
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to commit EmailDeliveryLogs: {e}")
                return []

        # 9. Immediate Delivery Dispatch (Non-blocking background dispatch via Celery worker in production, synchronous in testing)
        if dispatch_immediately:
            import os
            for log in created_logs:
                if not log.scheduled_for or log.scheduled_for <= datetime.now(timezone.utc):
                    if os.getenv("ENVIRONMENT") == "testing":
                        cls.dispatch_single_log(db, log.id)
                    else:
                        try:
                            from app.workers.notification_scheduler_worker import dispatch_single_email_log_task
                            dispatch_single_email_log_task.delay(str(log.id))
                        except Exception as async_exc:
                            logger.debug(f"[NotificationRuleEngine] Async Celery dispatch fallback for log {log.id}: {async_exc}")
                            cls.dispatch_single_log(db, log.id)
                    try:
                        db.refresh(log)
                    except Exception:
                        pass

        return created_logs

    @classmethod
    def dispatch_single_log(cls, db: Session, log_id: uuid.UUID) -> bool:
        from app.services.email_service import EmailService

        log = db.query(EmailDeliveryLog).filter(EmailDeliveryLog.id == log_id).first()
        if not log or log.status in ("SENT", "SIMULATED"):
            return True

        if not EmailService.is_smtp_configured():
            log.status = "SIMULATED"
            log.attempts = 1
            log.sent_at = datetime.now(timezone.utc)
            log.error_message = "SMTP credentials not configured in settings. Email was rendered and simulated."
            db.commit()
            return True

        log.attempts += 1
        log.status = "RETRYING" if log.attempts < log.max_attempts else "PENDING"
        db.commit()

        success = send_email_with_retry(
            to_email=log.recipient_email,
            subject=log.subject,
            body=log.body_html,
            metadata={"log_id": str(log.id), "event_name": log.event_name, "template_key": log.template_key},
            max_attempts=1  # Single attempt per execution pass; outbox worker handles retries with backoff
        )

        log = db.query(EmailDeliveryLog).filter(EmailDeliveryLog.id == log_id).first()
        if success:
            log.status = "SENT"
            log.sent_at = datetime.now(timezone.utc)
            log.error_message = None
        else:
            if log.attempts >= log.max_attempts:
                log.status = "FAILED"
                log.error_message = f"Failed after {log.attempts} attempts"
            else:
                log.status = "RETRYING"
                # Safe exponential backoff sequence: 30s -> 60s -> 120s -> 240s
                backoff_delays = [30, 60, 120, 240]
                delay_sec = backoff_delays[min(log.attempts - 1, len(backoff_delays) - 1)]
                log.scheduled_for = datetime.now(timezone.utc) + timedelta(seconds=delay_sec)
                log.error_message = f"Attempt {log.attempts} failed. Scheduled retry in {delay_sec}s."

        db.commit()
        return success

    @staticmethod
    def _evaluate_conditions(conditions: Optional[Dict[str, Any]], payload: Dict[str, Any]) -> bool:
        if not conditions:
            return True

        for key, target_val in conditions.items():
            if key.endswith("_gte"):
                field = key[:-4]
                if float(payload.get(field, 0)) < float(target_val):
                    return False
            elif key.endswith("_lte"):
                field = key[:-4]
                if float(payload.get(field, 0)) > float(target_val):
                    return False
            elif key.endswith("_eq"):
                field = key[:-3]
                if payload.get(field) != target_val:
                    return False
            elif key.endswith("_contains"):
                field = key[:-9]
                val = payload.get(field)
                if isinstance(val, list):
                    if not any(item in val for item in target_val):
                        return False
                elif str(target_val) not in str(val):
                    return False
        return True
