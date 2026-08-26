import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session

from app.models.notification_schedule import NotificationSchedule
from app.models.workspace import Workspace

logger = logging.getLogger("app")

DAY_MAP = {
    "monday": 0, "mon": 0, "0": 0,
    "tuesday": 1, "tue": 1, "1": 1,
    "wednesday": 2, "wed": 2, "2": 2,
    "thursday": 3, "thu": 3, "3": 3,
    "friday": 4, "fri": 4, "4": 4,
    "saturday": 5, "sat": 5, "5": 5,
    "sunday": 6, "sun": 6, "6": 6
}


class NotificationScheduleService:
   

    @classmethod
    def calculate_next_run(
        cls,
        schedule: NotificationSchedule,
        from_time: Optional[datetime] = None
    ) -> datetime:
        """
        Calculates the next run datetime in UTC based on schedule type, time_of_day,
        day_of_week, and timezone.
        """
        now_utc = from_time or datetime.now(timezone.utc)
        tz_str = schedule.default_timezone or "Asia/Kolkata"
        try:
            tz = ZoneInfo(tz_str)
        except Exception:
            tz = ZoneInfo("UTC")

        now_local = now_utc.astimezone(tz)

        # 1. Interval Minutes
        if schedule.schedule_type == "interval_minutes":
            mins = max(1, schedule.interval_minutes or 1)
            return now_utc + timedelta(minutes=mins)

        # Parse target hour and minute
        time_str = schedule.time_of_day or "08:00"
        try:
            parts = time_str.split(":")
            hour = int(parts[0])
            minute = int(parts[1])
        except Exception:
            hour, minute = 8, 0

        # 2. Daily Schedule
        if schedule.schedule_type == "daily":
            target_local = now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if target_local <= now_local:
                target_local += timedelta(days=1)
            return target_local.astimezone(timezone.utc)

        # 3. Weekly Schedule
        if schedule.schedule_type == "weekly":
            day_str = (schedule.day_of_week or "monday").strip().lower()
            target_weekday = DAY_MAP.get(day_str, 0)
            current_weekday = now_local.weekday()

            days_ahead = (target_weekday - current_weekday) % 7
            target_local = (now_local + timedelta(days=days_ahead)).replace(
                hour=hour, minute=minute, second=0, microsecond=0
            )

            # If today is the target day but target time already passed, move to next week
            if target_local <= now_local:
                target_local += timedelta(days=7)

            return target_local.astimezone(timezone.utc)

        # Fallback to 1 day ahead
        return now_utc + timedelta(days=1)

    @classmethod
    def seed_default_schedules(cls, db: Session) -> int:
        """
        Idempotently seeds baseline dynamic notification schedules into the database.
        """
        initial_schedules = [
            {
                "event_name": "report.daily_summary",
                "display_name": "Daily Dashboard Summary",
                "description": "Morning briefing email with leads, revenue, unanswered chats, and credit balance.",
                "schedule_type": "daily",
                "time_of_day": "08:00",
                "day_of_week": None,
                "interval_minutes": None,
                "default_timezone": "Asia/Kolkata",
                "is_active": True
            },
            {
                "event_name": "report.weekly_performance",
                "display_name": "Weekly Performance Report",
                "description": "Weekly funnel conversion rates, top sales agents, and automation statistics.",
                "schedule_type": "weekly",
                "time_of_day": "08:30",
                "day_of_week": "monday",
                "interval_minutes": None,
                "default_timezone": "Asia/Kolkata",
                "is_active": True
            },
            {
                "event_name": "onboarding.milestones",
                "display_name": "Onboarding & Payment Reminders",
                "description": "Scans onboarding inactivity (1-2d) and payment failure followups (24h/72h).",
                "schedule_type": "daily",
                "time_of_day": "09:00",
                "day_of_week": None,
                "interval_minutes": None,
                "default_timezone": "Asia/Kolkata",
                "is_active": True
            },
            {
                "event_name": "lead.inactive_scan",
                "display_name": "Inactive Lead Scanner",
                "description": "Scans dormant leads at 1, 3, and 7-day intervals and sends re-engagement follow-up tasks.",
                "schedule_type": "daily",
                "time_of_day": "10:00",
                "day_of_week": None,
                "interval_minutes": None,
                "default_timezone": "Asia/Kolkata",
                "is_active": True
            },
            {
                "event_name": "lead.sla_scan",
                "display_name": "Lead SLA Breach Monitor",
                "description": "Monitors unreplied incoming leads waiting more than 15 minutes.",
                "schedule_type": "interval_minutes",
                "time_of_day": None,
                "day_of_week": None,
                "interval_minutes": 1,
                "default_timezone": "Asia/Kolkata",
                "is_active": True
            }
        ]

        inserted = 0
        now_utc = datetime.now(timezone.utc)
        for s in initial_schedules:
            existing = db.query(NotificationSchedule).filter(
                NotificationSchedule.event_name == s["event_name"]
            ).first()
            if not existing:
                new_sched = NotificationSchedule(
                    id=uuid.uuid4(),
                    event_name=s["event_name"],
                    display_name=s["display_name"],
                    description=s["description"],
                    schedule_type=s["schedule_type"],
                    time_of_day=s["time_of_day"],
                    day_of_week=s["day_of_week"],
                    interval_minutes=s["interval_minutes"],
                    default_timezone=s["default_timezone"],
                    is_active=s["is_active"],
                    next_run_at=now_utc
                )
                db.add(new_sched)
                inserted += 1

        if inserted > 0:
            try:
                db.commit()
            except Exception:
                db.rollback()
        return inserted

    @staticmethod
    def get_workspace_timezone(workspace: Optional[Workspace]) -> str:
        """
        Extracts workspace timezone from settings or defaults to Asia/Kolkata.
        """
        if not workspace:
            return "Asia/Kolkata"
        ws_settings = getattr(workspace, "settings", None) or {}
        if isinstance(ws_settings, dict) and ws_settings.get("timezone"):
            return ws_settings["timezone"]
        return "Asia/Kolkata"
