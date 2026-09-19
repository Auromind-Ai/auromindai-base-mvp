import csv
import io
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
from zoneinfo import ZoneInfo
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.ai_action import Lead
from app.models.lead_report_setting import LeadReportSetting
from app.models.workspace import Workspace
from app.services.email_service import EmailService

logger = logging.getLogger("auromind")

CSV_COLUMNS = [
    ("name", "Name"),
    ("phone", "Phone"),
    ("email", "Email"),
    ("company", "Company"),
    ("source", "Source"),
    ("score", "Lead Score"),
    ("lead_tier", "Tier"),
    ("status", "Status"),
    ("intent_signals", "Buying Intent"),
    ("created_at", "Created Date"),
    ("last_activity_at", "Last Activity"),
]


DEFAULT_SUBJECT_TEMPLATE = "{frequency} Qualified Leads Report ({date})"

DEFAULT_BODY_TEMPLATE = """Hi Team,

Please find attached the {frequency_lower} qualified leads report.

• Total Qualified Leads: {total_leads}
• Date: {date}
• File: {filename}

The leads in this report have a lead score of {min_score}% or higher.

Regards,
{workspace_name}"""


def render_template(template_str: Any, variables: Dict[str, Any]) -> str:
    if not isinstance(template_str, str) or not template_str:
        return ""
    result = template_str
    for key, value in variables.items():
        result = result.replace(f"{{{key}}}", str(value if value is not None else ""))
    return result


def ensure_columns(db: Session):
    try:
        from sqlalchemy import inspect, text
        bind = db.get_bind()
        inspector = inspect(bind)
        if "lead_report_settings" in inspector.get_table_names():
            cols = [c["name"] for c in inspector.get_columns("lead_report_settings")]
            with bind.connect() as conn:
                if "subject_template" not in cols:
                    conn.execute(text("ALTER TABLE lead_report_settings ADD COLUMN subject_template VARCHAR(255)"))
                    conn.commit()
                if "body_template" not in cols:
                    conn.execute(text("ALTER TABLE lead_report_settings ADD COLUMN body_template TEXT"))
                    conn.commit()
    except Exception as e:
        logger.warning(f"Notice during lead_report_settings column check: {e}")


def _format_cell(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(val, list):
        return ", ".join(str(x) for x in val)
    if isinstance(val, dict):
        active_keys = [
            k.replace("_", " ") for k, v in val.items()
            if v is True or (isinstance(v, dict) and v.get("value") is True)
        ]
        return ", ".join(active_keys) if active_keys else ""
    s = str(val)
    if s.startswith(("=", "+", "-", "@", "\t", "\r", "\n")):
        return "'" + s
    return s


def parse_time_str(time_str: str) -> tuple[int, int]:
    """Parse time string like '09:00', '09:00 AM', '9:30 PM' into (hour_24, minute)."""
    clean = (time_str or "09:00").strip().upper()
    try:
        if "AM" in clean or "PM" in clean:
            dt = datetime.strptime(clean, "%I:%M %p")
            return dt.hour, dt.minute
        parts = clean.split(":")
        return int(parts[0]), int(parts[1])
    except Exception:
        return 9, 0


class LeadEmailReportService:

    @classmethod
    def get_or_create_settings(cls, db: Session, workspace_id: UUID) -> LeadReportSetting:
        ensure_columns(db)
        setting = db.query(LeadReportSetting).filter(
            LeadReportSetting.workspace_id == workspace_id
        ).first()
        if not setting:
            setting = LeadReportSetting(
                workspace_id=workspace_id,
                is_active=False,
                min_score=50,
                frequency="daily",
                send_time="09:00",
                recipient_emails=[],
                attach_csv=True,
                subject_template=DEFAULT_SUBJECT_TEMPLATE,
                body_template=DEFAULT_BODY_TEMPLATE,
            )
            db.add(setting)
            db.commit()
            db.refresh(setting)
        return setting

    @classmethod
    def get_workspace_timezone(cls, db: Session, workspace_id: UUID) -> str:
        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if ws and getattr(ws, "settings", None) and isinstance(ws.settings, dict):
            return ws.settings.get("timezone", "Asia/Kolkata")
        return "Asia/Kolkata"

    @classmethod
    def calculate_next_run(
        cls,
        frequency: str,
        send_time: str,
        ws_tz_str: str = "Asia/Kolkata",
        from_time: Optional[datetime] = None
    ) -> datetime:
        now_utc = from_time or datetime.now(timezone.utc)
        try:
            tz = ZoneInfo(ws_tz_str)
        except Exception:
            tz = ZoneInfo("Asia/Kolkata")

        now_local = now_utc.astimezone(tz)
        hour, minute = parse_time_str(send_time)

        freq = (frequency or "daily").strip().lower()
        if freq == "weekly":
            # Schedule next Monday at target time
            days_ahead = (0 - now_local.weekday()) % 7
            target_local = (now_local + timedelta(days=days_ahead)).replace(
                hour=hour, minute=minute, second=0, microsecond=0
            )
            if target_local <= now_local:
                target_local += timedelta(days=7)
        elif freq == "monthly":
            # Schedule 1st of next month at target time
            if now_local.month == 12:
                target_month = 1
                target_year = now_local.year + 1
            else:
                target_month = now_local.month + 1
                target_year = now_local.year
            target_local = now_local.replace(
                year=target_year, month=target_month, day=1,
                hour=hour, minute=minute, second=0, microsecond=0
            )
        else:
            # Daily schedule
            target_local = now_local.replace(
                hour=hour, minute=minute, second=0, microsecond=0
            )
            if target_local <= now_local:
                target_local += timedelta(days=1)

        return target_local.astimezone(timezone.utc)

    @classmethod
    def update_settings(cls, db: Session, workspace_id: UUID, data: Dict[str, Any]) -> LeadReportSetting:
        setting = cls.get_or_create_settings(db, workspace_id)

        if "is_active" in data:
            setting.is_active = bool(data["is_active"])
        if "min_score" in data:
            setting.min_score = int(data["min_score"])
        if "frequency" in data:
            setting.frequency = str(data["frequency"]).strip().lower()
        if "send_time" in data:
            # Normalize to HH:MM if possible
            h, m = parse_time_str(str(data["send_time"]))
            setting.send_time = f"{h:02d}:{m:02d}"
        if "recipient_emails" in data:
            emails = data["recipient_emails"]
            if isinstance(emails, list):
                setting.recipient_emails = [str(e).strip() for e in emails if e and "@" in str(e)]
        if "attach_csv" in data:
            setting.attach_csv = bool(data["attach_csv"])

        if "subject_template" in data:
            val = str(data["subject_template"]).strip() if data["subject_template"] else None
            setting.subject_template = val
        if "body_template" in data:
            val = str(data["body_template"]).strip() if data["body_template"] else None
            setting.body_template = val

        tz_str = cls.get_workspace_timezone(db, workspace_id)
        if setting.is_active:
            setting.next_run_at = cls.calculate_next_run(
                setting.frequency,
                setting.send_time,
                tz_str
            )
        else:
            setting.next_run_at = None

        db.commit()
        db.refresh(setting)
        return setting

    @classmethod
    def get_qualified_leads_query(cls, db: Session, workspace_id: UUID, min_score: int):
        return (
            db.query(Lead)
            .filter(
                Lead.workspace_id == workspace_id,
                func.coalesce(Lead.score, 0) >= min_score
            )
            .order_by(Lead.score.desc(), Lead.created_at.desc())
        )

    @classmethod
    def generate_csv_bytes(cls, leads: List[Lead]) -> bytes:
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        # Header row
        writer.writerow([label for _, label in CSV_COLUMNS])

        for lead in leads:
            row = []
            for field, _ in CSV_COLUMNS:
                val = getattr(lead, field, "")
                row.append(_format_cell(val))
            writer.writerow(row)

        return output.getvalue().encode("utf-8-sig")

    @classmethod
    def build_email_content(
        cls,
        setting: LeadReportSetting,
        lead_count: int,
        filename: str,
        workspace_name: str = "OrbionAgents",
        custom_subject: Optional[str] = None,
        custom_body: Optional[str] = None,
    ) -> Dict[str, str]:
        date_str = datetime.now().strftime("%b %d, %Y")
        freq_label = {
            "daily": "Daily",
            "weekly": "Weekly",
            "monthly": "Monthly"
        }.get(setting.frequency.lower(), "Daily")

        variables = {
            "total_leads": lead_count,
            "date": date_str,
            "filename": filename,
            "min_score": f"{setting.min_score}%",
            "frequency": freq_label,
            "frequency_lower": freq_label.lower(),
            "workspace_name": workspace_name,
        }

        subj_tmpl = (custom_subject if isinstance(custom_subject, str) and custom_subject else None) or setting.subject_template or DEFAULT_SUBJECT_TEMPLATE
        body_tmpl = (custom_body if isinstance(custom_body, str) and custom_body else None) or setting.body_template or DEFAULT_BODY_TEMPLATE

        subject = render_template(subj_tmpl, variables)
        body_text = render_template(body_tmpl, variables)

        import html
        escaped_body = html.escape(body_text)

        body_html = f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; line-height: 1.6;">
    <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">{html.escape(subject)}</h2>
    <div style="font-size: 14px; color: #334155; white-space: pre-wrap; word-break: break-word;">{escaped_body}</div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Sent automatically by <strong style="color: #0f172a;">{html.escape(workspace_name)}</strong></p>
</div>"""

        return {
            "subject": subject,
            "plain_text": body_text,
            "html_body": body_html,
            "filename": filename,
            "date_str": date_str
        }

    @classmethod
    def send_report(
        cls,
        db: Session,
        workspace_id: UUID,
        is_test: bool = False,
        recipient_override: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        setting = cls.get_or_create_settings(db, workspace_id)
        recipients = recipient_override or setting.recipient_emails

        if not recipients:
            raise ValueError("No recipient emails configured for this report.")

        leads = cls.get_qualified_leads_query(db, workspace_id, setting.min_score).all()
        lead_count = len(leads)

        date_slug = datetime.now().strftime("%Y-%m-%d")
        filename = f"qualified_leads_{date_slug}.csv"

        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        ws_name = ws.name if ws and ws.name else "OrbionAgents"

        content = cls.build_email_content(setting, lead_count, filename, ws_name)

        attachments = []
        if setting.attach_csv:
            csv_bytes = cls.generate_csv_bytes(leads)
            attachments.append({
                "filename": filename,
                "content": csv_bytes,
                "mime_type": "text/csv"
            })

        send_result = EmailService.send_email_for_workspace(
            db=db,
            workspace_id=workspace_id,
            to_email=recipients,
            subject=content["subject"],
            body=content["html_body"],
            plain_text=content["plain_text"],
            attachments=attachments
        )

        if not is_test:
            now_utc = datetime.now(timezone.utc)
            setting.last_sent_at = now_utc
            tz_str = cls.get_workspace_timezone(db, workspace_id)
            setting.next_run_at = cls.calculate_next_run(
                setting.frequency,
                setting.send_time,
                tz_str,
                from_time=now_utc
            )
            db.commit()

        return {
            "status": "success",
            "is_test": is_test,
            "lead_count": lead_count,
            "recipients": recipients,
            "filename": filename,
            "delivery_result": send_result
        }

    @classmethod
    def process_due_reports(cls, db: Session) -> int:
        now_utc = datetime.now(timezone.utc)
        all_active = (
            db.query(LeadReportSetting)
            .filter(
                LeadReportSetting.is_active == True,
                LeadReportSetting.next_run_at.isnot(None)
            )
            .all()
        )

        due_settings = []
        for s in all_active:
            nr = s.next_run_at
            if nr is not None:
                if nr.tzinfo is None:
                    nr = nr.replace(tzinfo=timezone.utc)
                if nr <= now_utc:
                    due_settings.append(s)

        processed = 0
        for setting in due_settings:
            try:
                if setting.recipient_emails:
                    cls.send_report(db, setting.workspace_id, is_test=False)
                    processed += 1
                else:
                    # Skip and advance next_run_at to avoid continuous loops
                    tz_str = cls.get_workspace_timezone(db, setting.workspace_id)
                    setting.next_run_at = cls.calculate_next_run(
                        setting.frequency,
                        setting.send_time,
                        tz_str,
                        from_time=now_utc
                    )
                    db.commit()
            except Exception as e:
                logger.error(f"[LeadReportScheduler] Error running report for workspace {setting.workspace_id}: {e}", exc_info=True)

        return processed
