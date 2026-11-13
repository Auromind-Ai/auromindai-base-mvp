import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

import httpx
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.config import settings
from app.core.permissions import has_workspace_permission
from app.models.notification import Notification
from app.models.push_device import PushDeviceToken
from app.models.user import User
from app.models.workspace import WorkspaceMember

logger = logging.getLogger("app")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_PUSH_BATCH_SIZE = 100
_TOKEN_RE = re.compile(r"^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$")


def _to_uuid(value: Any) -> Optional[UUID]:
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        return None


def is_valid_expo_push_token(token: Optional[str]) -> bool:
    if not token or not isinstance(token, str):
        return False
    return bool(_TOKEN_RE.match(token.strip()))


def _is_user_muted(prefs: Dict[str, Any]) -> bool:
    mute_until = prefs.get("mute_pushes_until")
    if not mute_until:
        return False
    try:
        mute_dt = datetime.fromisoformat(str(mute_until).replace("Z", "+00:00"))
        if mute_dt.tzinfo is None:
            mute_dt = mute_dt.replace(tzinfo=timezone.utc)
        return mute_dt > datetime.now(timezone.utc)
    except Exception:
        return False


def resolve_android_channel_id(notif_type: Optional[str]) -> str:
    lower = (notif_type or "").lower()
    if any(k in lower for k in ("message", "chat", "escalation", "lead", "inbox")):
        return "messages"
    return "default"


def build_push_data(
    *,
    notif_type: str,
    notification_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Construct deep-link data consumed by mobile navigateFromNotificationData."""
    data: Dict[str, Any] = {"type": notif_type}
    if notification_id:
        data["notification_id"] = str(notification_id)

    if payload and isinstance(payload, dict):
        conv_id = payload.get("conversation_id")
        lead_id = payload.get("lead_id")
        channel = payload.get("channel")
        route = payload.get("mobile_route") or payload.get("route")

        if conv_id:
            data["conversation_id"] = str(conv_id)
            if not route:
                route = f"/chat/{conv_id}"
        if lead_id:
            data["lead_id"] = str(lead_id)
            if not route and not conv_id:
                route = f"/customer/{lead_id}"
        if channel:
            data["channel"] = str(channel).lower()
        if route:
            data["route"] = str(route)

    return data


class ExpoPushService:
    """Production-ready Expo Push dispatch service for Android (FCM) & iOS (APNs)."""

    @staticmethod
    def register_device_token(
        db: Session,
        *,
        user_id: UUID | str,
        push_token: str,
        platform: str = "android",
        device_name: Optional[str] = None,
        device_id: Optional[str] = None,
    ) -> PushDeviceToken:
        clean_token = push_token.strip()
        if not is_valid_expo_push_token(clean_token):
            raise ValueError("Invalid Expo push token format.")

        clean_user_id = _to_uuid(user_id)
        if not clean_user_id:
            raise ValueError("Invalid user ID.")

        norm_platform = (platform or "android").strip().lower()
        if norm_platform not in ("android", "ios", "web"):
            norm_platform = "android"

        now_utc = datetime.now(timezone.utc)
        existing = (
            db.query(PushDeviceToken)
            .filter(PushDeviceToken.push_token == clean_token)
            .first()
        )
        if existing:
            existing.user_id = clean_user_id
            existing.platform = norm_platform
            existing.device_name = device_name or existing.device_name
            existing.device_id = device_id or existing.device_id
            existing.is_active = True
            existing.last_seen_at = now_utc
            record = existing
        else:
            record = PushDeviceToken(
                id=uuid.uuid4(),
                user_id=clean_user_id,
                push_token=clean_token,
                platform=norm_platform,
                device_name=device_name,
                device_id=device_id,
                is_active=True,
                last_seen_at=now_utc,
            )
            db.add(record)

        # Keep legacy user.preferences fields synced for backward compatibility
        user = db.query(User).filter(User.id == clean_user_id).first()
        if user:
            prefs = dict(user.preferences or {})
            prefs["expo_push_token"] = clean_token
            prefs["push_platform"] = norm_platform
            if device_name:
                prefs["push_device_name"] = device_name
            prefs["push_enabled"] = True
            user.preferences = prefs
            flag_modified(user, "preferences")

        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def unregister_device_token(
        db: Session,
        *,
        user_id: UUID | str,
        push_token: Optional[str] = None,
    ) -> int:
        clean_user_id = _to_uuid(user_id)
        if not clean_user_id:
            return 0

        query = db.query(PushDeviceToken).filter(
            PushDeviceToken.user_id == clean_user_id,
            PushDeviceToken.is_active == True,
        )
        if push_token:
            query = query.filter(PushDeviceToken.push_token == push_token.strip())

        updated = query.update({PushDeviceToken.is_active: False}, synchronize_session=False)

        user = db.query(User).filter(User.id == clean_user_id).first()
        if user:
            prefs = dict(user.preferences or {})
            current_pref_token = prefs.get("expo_push_token")
            if not push_token or current_pref_token == push_token.strip():
                next_active = (
                    db.query(PushDeviceToken)
                    .filter(
                        PushDeviceToken.user_id == clean_user_id,
                        PushDeviceToken.is_active == True,
                    )
                    .order_by(PushDeviceToken.last_seen_at.desc())
                    .first()
                )
                prefs["expo_push_token"] = next_active.push_token if next_active else None
                user.preferences = prefs
                flag_modified(user, "preferences")

        db.commit()
        return updated

    @staticmethod
    def get_active_tokens_for_user(db: Session, user: User) -> List[str]:
        rows = (
            db.query(PushDeviceToken)
            .filter(PushDeviceToken.user_id == user.id)
            .all()
        )
        active_tokens: List[str] = []
        known_tokens: set[str] = set()

        for row in rows:
            known_tokens.add(row.push_token)
            if row.is_active and is_valid_expo_push_token(row.push_token):
                if row.push_token not in active_tokens:
                    active_tokens.append(row.push_token)

        # Fallback for tokens stored only in user.preferences before multi-device table
        prefs = user.preferences or {}
        legacy_token = prefs.get("expo_push_token")
        if (
            isinstance(legacy_token, str)
            and legacy_token not in known_tokens
            and is_valid_expo_push_token(legacy_token)
        ):
            active_tokens.append(legacy_token.strip())

        return active_tokens

    @staticmethod
    def _deactivate_invalid_tokens(db: Session, invalid_tokens: List[str]) -> None:
        if not invalid_tokens:
            return
        try:
            db.query(PushDeviceToken).filter(
                PushDeviceToken.push_token.in_(invalid_tokens)
            ).update({PushDeviceToken.is_active: False}, synchronize_session=False)

            users = db.query(User).filter(User.preferences.isnot(None)).all()
            for u in users:
                prefs = dict(u.preferences or {})
                if prefs.get("expo_push_token") in invalid_tokens:
                    prefs["expo_push_token"] = None
                    u.preferences = prefs
                    flag_modified(u, "preferences")
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.warning(f"[ExpoPush] Failed to deactivate stale tokens: {exc}")

    @staticmethod
    def _post_expo_messages(db: Session, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not messages:
            return {"sent": 0, "errors": 0, "tickets": []}

        headers: Dict[str, str] = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
        }
        expo_access_token = getattr(settings, "EXPO_ACCESS_TOKEN", None)
        if expo_access_token:
            headers["Authorization"] = f"Bearer {expo_access_token.strip()}"

        sent_count = 0
        error_count = 0
        invalid_tokens: List[str] = []
        tickets: List[Dict[str, Any]] = []

        for idx in range(0, len(messages), EXPO_PUSH_BATCH_SIZE):
            batch = messages[idx : idx + EXPO_PUSH_BATCH_SIZE]
            try:
                resp = httpx.post(
                    EXPO_PUSH_URL,
                    json=batch,
                    headers=headers,
                    timeout=5.0,
                )
                if resp.status_code >= 400:
                    logger.warning(
                        "[ExpoPush] HTTP %s from Expo Push API: %s",
                        resp.status_code,
                        resp.text[:300],
                    )
                    error_count += len(batch)
                    continue

                body = resp.json() if resp.content else {}
                data_tickets = body.get("data") or []
                if isinstance(data_tickets, dict):
                    data_tickets = [data_tickets]

                for msg_item, ticket in zip(batch, data_tickets):
                    tickets.append(ticket)
                    if ticket.get("status") == "ok":
                        sent_count += 1
                    else:
                        error_count += 1
                        err_code = (ticket.get("details") or {}).get("error")
                        if err_code == "DeviceNotRegistered":
                            invalid_tokens.append(msg_item["to"])
                        logger.warning(
                            "[ExpoPush] Ticket error (%s): %s",
                            err_code or "unknown",
                            ticket.get("message") or ticket,
                        )
            except Exception as exc:
                error_count += len(batch)
                logger.warning(f"[ExpoPush] Batch delivery exception: {exc}")

        if invalid_tokens:
            ExpoPushService._deactivate_invalid_tokens(db, invalid_tokens)

        return {"sent": sent_count, "errors": error_count, "tickets": tickets}

    @staticmethod
    def send_push_to_user(
        db: Session,
        *,
        user_id: UUID | str,
        title: str,
        message: str,
        notif_type: str = "system",
        notification_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        channel_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        clean_user_id = _to_uuid(user_id)
        if not clean_user_id:
            return {"sent": 0, "errors": 0, "skipped": "invalid_user"}

        user = db.query(User).filter(User.id == clean_user_id, User.is_active == True).first()
        if not user:
            return {"sent": 0, "errors": 0, "skipped": "user_not_found"}

        prefs = user.preferences or {}
        if prefs.get("push_enabled") is False:
            return {"sent": 0, "errors": 0, "skipped": "push_disabled"}

        if _is_user_muted(prefs):
            return {"sent": 0, "errors": 0, "skipped": "muted"}

        tokens = ExpoPushService.get_active_tokens_for_user(db, user)
        if not tokens:
            return {"sent": 0, "errors": 0, "skipped": "no_tokens"}

        show_preview = prefs.get("show_message_preview", True)
        if show_preview:
            body_text = message or title
        else:
            body_text = (
                "You have a new message."
                if resolve_android_channel_id(notif_type) == "messages"
                else "You have a new notification."
            )

        unread_count = (
            db.query(Notification)
            .filter(Notification.user_id == clean_user_id, Notification.is_read == False)
            .count()
        )

        resolved_channel = channel_id or resolve_android_channel_id(notif_type)
        push_data = build_push_data(
            notif_type=notif_type,
            notification_id=notification_id,
            payload=data,
        )

        messages: List[Dict[str, Any]] = [
            {
                "to": token,
                "title": title,
                "body": body_text,
                "sound": "default",
                "priority": "high",
                "channelId": resolved_channel,
                "badge": max(unread_count, 1),
                "mutableContent": True,
                "data": push_data,
            }
            for token in tokens
        ]

        return ExpoPushService._post_expo_messages(db, messages)

    @staticmethod
    def enqueue_user_push(
        db: Session,
        *,
        user_id: UUID | str,
        title: str,
        message: str,
        notif_type: str = "system",
        notification_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        channel_id: Optional[str] = None,
    ) -> None:
        """Queue Expo push dispatch asynchronously via Celery, falling back safely."""
        if os.getenv("ENVIRONMENT") == "testing" or getattr(settings, "ENVIRONMENT", "") == "testing":
            ExpoPushService.send_push_to_user(
                db,
                user_id=user_id,
                title=title,
                message=message,
                notif_type=notif_type,
                notification_id=notification_id,
                data=data,
                channel_id=channel_id,
            )
            return

        try:
            from app.workers.notification_scheduler_worker import dispatch_expo_push_task

            dispatch_expo_push_task.delay(
                user_id=str(user_id),
                title=title,
                message=message,
                notif_type=notif_type,
                notification_id=notification_id,
                data=data,
                channel_id=channel_id,
            )
        except Exception as async_exc:
            logger.debug(f"[ExpoPush] Celery enqueue fallback for user {user_id}: {async_exc}")
            ExpoPushService.send_push_to_user(
                db,
                user_id=user_id,
                title=title,
                message=message,
                notif_type=notif_type,
                notification_id=notification_id,
                data=data,
                channel_id=channel_id,
            )

    @staticmethod
    def enqueue_workspace_push(
        db: Session,
        *,
        workspace_id: UUID | str,
        title: str,
        message: str,
        notif_type: str = "new_message",
        data: Optional[Dict[str, Any]] = None,
        deduplication_key: Optional[str] = None,
        required_permission: Optional[str] = None,
    ) -> int:
        clean_ws_id = _to_uuid(workspace_id)
        if not clean_ws_id:
            return 0

        if deduplication_key:
            from app.services.notification_service import NotificationService

            if NotificationService.is_duplicate(f"push:{deduplication_key}"):
                return 0

        members = (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == clean_ws_id,
                WorkspaceMember.is_active == True,
            )
            .all()
        )

        dispatched = 0
        for member in members:
            if required_permission:
                if not has_workspace_permission(
                    member.role, member.permissions, required_permission
                ):
                    continue

            ExpoPushService.enqueue_user_push(
                db,
                user_id=member.user_id,
                title=title,
                message=message,
                notif_type=notif_type,
                data=data,
            )
            dispatched += 1

        return dispatched
