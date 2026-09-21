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
from app.schemas.crm_filters import LeadFilters
from app.schemas.lead_report import LeadReportSettingsUpdate
from app.services.crm.lead_query import lead_query

logger = logging.getLogger("auromind")

CSV_COLUMNS = [
    ("serial", "S.no"), ("created_at", "Date"), ("source", "Source"),
    ("name", "Name"), ("phone", "Phone"), ("score", "Lead Score"),
    ("lead_tier", "Lead Category"),
]
DEFAULT_CSV_COLUMNS = [key for key, _ in CSV_COLUMNS]
REPORT_FILTER_KEYS = {"search", "sources", "tiers", "statuses", "max_score", "created_from", "created_to", "favorite"}


def validate_report_filters(filters, min_score=0):
    if not isinstance(filters, dict) or set(filters) - REPORT_FILTER_KEYS:
        raise ValueError("Unsupported report filters")
    return LeadFilters.model_validate({**filters, "min_score": min_score})


def validate_csv_columns(columns):
    if columns is None or columns == []:
        return list(DEFAULT_CSV_COLUMNS)
    if not isinstance(columns, list) or not columns or any(key not in DEFAULT_CSV_COLUMNS for key in columns) or len(set(columns)) != len(columns):
        raise ValueError("Choose valid CSV columns")
    return columns



DEFAULT_SUBJECT_TEMPLATE = "{frequency} Qualified Leads Report ({date})"

DEFAULT_BODY_TEMPLATE = """Hi Team,

Please find attached the {frequency_lower} qualified leads report.

• Total Qualified Leads: {total_leads}
• Date: {date}
• File: {filename}

The leads in this report have a lead score of {min_score} or higher.

Regards,
{workspace_name}"""


def render_template(template_str: Any, variables: Dict[str, Any]) -> str:
    if not isinstance(template_str, str) or not template_str:
        return ""
    result = template_str
    for key, value in variables.items():
        result = result.replace(f"{{{key}}}", str(value if value is not None else ""))
    return result


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
        data = LeadReportSettingsUpdate.model_validate(data).model_dump(exclude_unset=True)
        setting = cls.get_or_create_settings(db, workspace_id)
        validate_report_filters(data.get("report_filters", setting.report_filters or {}), int(data.get("min_score", setting.min_score)))
        if "csv_columns" in data:
            validated_columns = validate_csv_columns(data["csv_columns"])
            setting.csv_columns = [] if data["csv_columns"] == [] else validated_columns
        if "report_filters" in data:
            setting.report_filters = validate_report_filters(data["report_filters"]).model_dump(mode="json", exclude_none=True, exclude_defaults=True, exclude={"min_score"})

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
    def get_qualified_leads_query(cls, db: Session, workspace_id: UUID, min_score: int, filters=None):
        parsed = validate_report_filters(filters or {}, min_score)
        return lead_query(db, workspace_id, parsed).order_by(Lead.score.desc().nullsfirst(), Lead.id)

    @classmethod
    def csv_rows(cls, leads, columns=None, timezone_name="Asia/Kolkata"):
        columns = validate_csv_columns(columns)
        try:
            tz = ZoneInfo(timezone_name)
        except Exception:
            tz = ZoneInfo("Asia/Kolkata")
        sources = {"whatsapp": "WhatsApp", "instagram": "Instagram", "sms": "Twilio", "phone": "Twilio", "twilio": "Twilio", "gmail": "Gmail", "email": "Email", "manual": "Manual", "web": "Manual"}
        for index, lead in enumerate(leads, 1):
            created = lead.created_at
            if created and created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            values = {
                "serial": index,
                "created_at": created.astimezone(tz).strftime("%b %d, %Y") if created else "\u2014",
                "source": sources.get((lead.source or "manual").lower(), lead.source or "Manual"),
                "name": lead.name or lead.phone or "Unknown Lead",
                "phone": lead.phone or "\u2014",
                "score": f"{lead.score or 0} / 100",
                "lead_tier": {"hot": "\U0001f525 Hot", "warm": "\U0001f7e1 Warm", "cold": "\u2744\ufe0f Cold"}.get((lead.lead_tier or "cold").lower(), "Unclassified"),
            }
            yield [str(values[key]) for key in columns]

    @classmethod
    def generate_csv_bytes(cls, leads: List[Lead], columns=None, timezone_name="Asia/Kolkata") -> bytes:
        columns = validate_csv_columns(columns)
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        labels = dict(CSV_COLUMNS)
        writer.writerow([labels[key] for key in columns])
        for row in cls.csv_rows(leads, columns, timezone_name):
            writer.writerow([_format_cell(value) for value in row])
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
        recipient_override: Optional[List[str]] = None,
        settings_override: Optional[dict] = None
    ) -> Dict[str, Any]:
        setting = cls.get_or_create_settings(db, workspace_id)
        if is_test and settings_override is not None:
            from types import SimpleNamespace
            settings_override = LeadReportSettingsUpdate.model_validate(settings_override).model_dump(exclude_unset=True)
            fields = ("min_score", "frequency", "attach_csv", "report_filters", "csv_columns", "subject_template", "body_template", "recipient_emails")
            setting = SimpleNamespace(**{key: settings_override.get(key, getattr(setting, key)) for key in fields})
            validate_report_filters(setting.report_filters or {}, setting.min_score)
            validate_csv_columns(setting.csv_columns)
        recipients = recipient_override or setting.recipient_emails

        if not recipients:
            raise ValueError("No recipient emails configured for this report.")

        leads = cls.get_qualified_leads_query(db, workspace_id, setting.min_score, setting.report_filters).all()
        lead_count = len(leads)

        date_slug = datetime.now().strftime("%Y-%m-%d")
        filename = f"qualified_leads_{date_slug}.csv"

        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        ws_name = ws.name if ws and ws.name else "OrbionAgents"

        content = cls.build_email_content(setting, lead_count, filename, ws_name)

        attachments = []
        if setting.attach_csv:
            csv_bytes = cls.generate_csv_bytes(leads, setting.csv_columns, cls.get_workspace_timezone(db, workspace_id))
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
        due_ids = [row[0] for row in db.query(LeadReportSetting.id).filter(
            LeadReportSetting.is_active.is_(True),
            LeadReportSetting.next_run_at <= now_utc,
        ).all()]
        processed = 0
        for setting_id in due_ids:
            # Recheck under a row lock so multiple API workers cannot send the same due report.
            setting = db.query(LeadReportSetting).filter(
                LeadReportSetting.id == setting_id,
                LeadReportSetting.is_active.is_(True),
                LeadReportSetting.next_run_at <= now_utc,
            ).populate_existing().with_for_update(skip_locked=True).first()
            if setting is None:
                continue
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
            except Exception:
                db.rollback()
                logger.exception("[LeadReportScheduler] Error running scheduled lead report")

        return processed


    @classmethod
    def settings_payload(cls, db, workspace_id, setting):
        lead_count = LeadEmailReportService.get_qualified_leads_query(db, workspace_id, setting.min_score, setting.report_filters).count()

        return {
            "settings": {
                "id": str(setting.id),
                "workspace_id": str(setting.workspace_id),
                "is_active": setting.is_active,
                "min_score": setting.min_score,
                "frequency": setting.frequency,
                "send_time": setting.send_time,
                "recipient_emails": setting.recipient_emails or [],
                "attach_csv": setting.attach_csv,
                "report_filters": setting.report_filters or {},
                "csv_columns": setting.csv_columns,
                "subject_template": setting.subject_template or DEFAULT_SUBJECT_TEMPLATE,
                "body_template": setting.body_template or DEFAULT_BODY_TEMPLATE,
                "default_subject": DEFAULT_SUBJECT_TEMPLATE,
                "default_body": DEFAULT_BODY_TEMPLATE,
                "last_sent_at": setting.last_sent_at.isoformat() if setting.last_sent_at else None,
                "next_run_at": setting.next_run_at.isoformat() if setting.next_run_at else None,
            },
            "lead_count": lead_count,
            "csv_column_options": [{"key": key, "label": label} for key, label in CSV_COLUMNS],
        }

    @classmethod
    def sample_preview(cls, db, workspace_id, min_score, filters, columns, frequency, subject_template, body_template):
        import json
        try:
            report_filters = json.loads(filters) if isinstance(filters, str) else {}
            selected_columns = validate_csv_columns(json.loads(columns) if isinstance(columns, str) else None)
            query = LeadEmailReportService.get_qualified_leads_query(db, workspace_id, min_score, report_filters)
            lead_count = query.count()
            leads = query.limit(10).all()
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

        sample_items = [
            {
                "id": str(l.id),
                "name": l.name or "N/A",
                "phone": l.phone or "N/A",
                "email": l.email or "N/A",
                "company": l.company or "N/A",
                "source": l.source or "N/A",
                "score": l.score or 0,
                "lead_tier": l.lead_tier or "cold",
                "status": l.status or "new",
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in leads
        ]

        filename = f"qualified_leads_{datetime.now().strftime('%Y-%m-%d')}.csv"
        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        ws_name = ws.name if ws and ws.name else "OrbionAgents"

        setting = LeadEmailReportService.get_or_create_settings(db, workspace_id)
        from types import SimpleNamespace
        setting = SimpleNamespace(min_score=min_score, frequency=frequency,
            subject_template=setting.subject_template, body_template=setting.body_template)

        content = LeadEmailReportService.build_email_content(
            setting=setting,
            lead_count=lead_count,
            filename=filename,
            workspace_name=ws_name,
            custom_subject=subject_template if isinstance(subject_template, str) and subject_template else None,
            custom_body=body_template if isinstance(body_template, str) and body_template else None
        )

        return {
            "total_count": lead_count,
            "sample_leads": sample_items,
            "csv_columns": [{"key": key, "label": dict(CSV_COLUMNS)[key]} for key in selected_columns],
            "csv_rows": list(LeadEmailReportService.csv_rows(leads, selected_columns, LeadEmailReportService.get_workspace_timezone(db, workspace_id))),
            "subject": content["subject"],
            "body_text": content["plain_text"],
            "filename": filename,
            "date_str": content["date_str"],
        }
