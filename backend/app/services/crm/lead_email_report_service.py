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
from app.services.crm.lead_flow import get_lead_flow_names

logger = logging.getLogger("auromind")

CSV_COLUMNS = [
    ("serial", "S.no"), ("created_at", "Date"), ("source", "Source"),
    ("flow_name", "Flow Name"), ("name", "Name"), ("phone", "Phone"), ("score", "Lead Score"),
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

DEFAULT_ZERO_LEADS_SUBJECT = "{frequency} Qualified Leads Update - No New Leads ({date})"

DEFAULT_ZERO_LEADS_BODY_TEMPLATE = """Hi Team,

This is your scheduled {frequency_lower} qualified leads update for {date}.

Currently, there are no new qualified leads meeting your criteria (lead score ≥ {min_score}) since the last report.

• New Qualified Leads: 0
• Minimum Score Threshold: {min_score}
• Status: All previous leads have been delivered. AI agents are actively monitoring incoming traffic and inquiries.

You will automatically receive the next scheduled report as soon as new qualified leads arrive.

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
                only_new_leads=True,
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
        send_time: str | list[str],
        ws_tz_str: str = "Asia/Kolkata",
        from_time: Optional[datetime] = None
    ) -> datetime:
        now_utc = from_time or datetime.now(timezone.utc)
        if isinstance(send_time, list):
            if not send_time:
                raise ValueError("Choose at least one report time")
            return min(cls.calculate_next_run(frequency, value, ws_tz_str, now_utc) for value in send_time)
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
            target_local = now_local.replace(day=1, hour=hour, minute=minute, second=0, microsecond=0)
            if target_local <= now_local:
                target_local = target_local.replace(
                    year=now_local.year + (1 if now_local.month == 12 else 0),
                    month=1 if now_local.month == 12 else now_local.month + 1,
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
        if "send_times" in data:
            setting.send_times = data["send_times"]
            setting.send_time = setting.send_times[0]
        elif "send_time" in data:
            setting.send_time = data["send_time"]
            setting.send_times = [setting.send_time]
        if "recipient_emails" in data:
            emails = data["recipient_emails"]
            if isinstance(emails, list):
                setting.recipient_emails = [str(e).strip() for e in emails if e and "@" in str(e)]
        if "attach_csv" in data:
            setting.attach_csv = bool(data["attach_csv"])
        if "only_new_leads" in data:
            setting.only_new_leads = bool(data["only_new_leads"])

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
                setting.send_times or [setting.send_time],
                tz_str
            )
        else:
            setting.next_run_at = None

        db.commit()
        db.refresh(setting)
        return setting

    @classmethod
    def get_qualified_leads_query(
        cls,
        db: Session,
        workspace_id: UUID,
        min_score: int,
        filters=None,
        only_new: bool = True,
        last_sent_at: Optional[datetime] = None
    ):
        parsed = validate_report_filters(filters or {}, min_score)
        q = lead_query(db, workspace_id, parsed)

        if only_new:
            from sqlalchemy import and_, or_
            conditions = []
            if hasattr(Lead, "last_reported_at"):
                conditions.append(Lead.last_reported_at.is_(None))
            if last_sent_at is not None:
                conditions.append(
                    or_(
                        Lead.created_at > last_sent_at,
                        and_(Lead.updated_at.isnot(None), Lead.updated_at > last_sent_at)
                    )
                )
            if conditions:
                q = q.filter(and_(*conditions))

        return q.order_by(Lead.score.desc().nullsfirst(), Lead.created_at.desc(), Lead.id)

    @classmethod
    def deduplicate_leads(cls, leads: List[Lead]) -> List[Lead]:
        seen_phones = set()
        seen_emails = set()
        seen_ids = set()
        unique: List[Lead] = []

        for lead in leads:
            if lead.id in seen_ids:
                continue

            raw_phone = getattr(lead, "normalized_phone", None) or getattr(lead, "phone", None) or ""
            phone_digits = "".join(ch for ch in str(raw_phone) if ch.isdigit())
            phone_key = phone_digits[-10:] if len(phone_digits) >= 10 else phone_digits

            raw_email = getattr(lead, "normalized_email", None) or getattr(lead, "email", None) or ""
            email_key = str(raw_email).strip().lower()

            if phone_key and phone_key in seen_phones:
                continue
            if email_key and email_key in seen_emails:
                continue

            if phone_key:
                seen_phones.add(phone_key)
            if email_key:
                seen_emails.add(email_key)
            seen_ids.add(lead.id)
            unique.append(lead)

        return unique

    @classmethod
    def csv_rows(cls, leads, columns=None, timezone_name="Asia/Kolkata", flow_names=None):
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
                "flow_name": (flow_names or {}).get(getattr(lead, "conversation_id", None), ""),
                "name": lead.name or lead.phone or "Unknown Lead",
                "phone": lead.phone or "\u2014",
                "score": f"{lead.score or 0} / 100",
                "lead_tier": {"hot": "\U0001f525 Hot", "warm": "\U0001f7e1 Warm", "cold": "\u2744\ufe0f Cold"}.get((lead.lead_tier or "cold").lower(), "Unclassified"),
            }
            yield [str(values[key]) for key in columns]

    @classmethod
    def generate_csv_bytes(cls, leads: List[Lead], columns=None, timezone_name="Asia/Kolkata", flow_names=None) -> bytes:
        columns = validate_csv_columns(columns)
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        labels = dict(CSV_COLUMNS)
        writer.writerow([labels[key] for key in columns])
        for row in cls.csv_rows(leads, columns, timezone_name, flow_names):
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

        import html

        if lead_count == 0:
            subj_tmpl = (custom_subject if isinstance(custom_subject, str) and custom_subject else None)
            if not subj_tmpl or subj_tmpl == DEFAULT_SUBJECT_TEMPLATE:
                subj_tmpl = DEFAULT_ZERO_LEADS_SUBJECT

            body_tmpl = (custom_body if isinstance(custom_body, str) and custom_body else None)
            if not body_tmpl or body_tmpl == DEFAULT_BODY_TEMPLATE or (getattr(setting, "body_template", None) and body_tmpl == setting.body_template and not custom_body):
                body_tmpl = DEFAULT_ZERO_LEADS_BODY_TEMPLATE

            subject = render_template(subj_tmpl, variables)
            body_text = render_template(body_tmpl, variables)
            escaped_body = html.escape(body_text)

            body_html = f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; line-height: 1.6; background-color: #ffffff;">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
        <span style="font-size: 15px; font-weight: 700; color: #0f172a;">{html.escape(workspace_name)}</span>
        <span style="display: inline-block; padding: 3px 10px; font-size: 11px; font-weight: 600; color: #2563eb; background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 9999px;">AI Monitoring Active</span>
    </div>
    <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">{html.escape(subject)}</h2>
    <div style="font-size: 14px; color: #334155; white-space: pre-wrap; word-break: break-word;">{escaped_body}</div>
    <div style="margin-top: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">Lead Delivery Status</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
                <td style="padding: 4px 0; color: #64748b;">New Qualified Leads</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #0f172a;">0</td>
            </tr>
            <tr>
                <td style="padding: 4px 0; color: #64748b;">Qualification Score</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #0f172a;">&ge; {setting.min_score}%</td>
            </tr>
            <tr>
                <td style="padding: 4px 0; color: #64748b;">Reporting Schedule</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #0f172a;">{freq_label}</td>
            </tr>
            <tr>
                <td style="padding: 4px 0; color: #64748b;">Status</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a;">Up to date &bull; No duplicates</td>
            </tr>
        </table>
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Sent automatically by <strong style="color: #0f172a;">{html.escape(workspace_name)}</strong> CRM</p>
</div>"""
        else:
            subj_tmpl = (custom_subject if isinstance(custom_subject, str) and custom_subject else None) or setting.subject_template or DEFAULT_SUBJECT_TEMPLATE
            body_tmpl = (custom_body if isinstance(custom_body, str) and custom_body else None) or setting.body_template or DEFAULT_BODY_TEMPLATE

            subject = render_template(subj_tmpl, variables)
            body_text = render_template(body_tmpl, variables)
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
            fields = ("min_score", "frequency", "attach_csv", "only_new_leads", "report_filters", "csv_columns", "subject_template", "body_template", "recipient_emails")
            setting = SimpleNamespace(**{key: settings_override.get(key, getattr(setting, key, None)) for key in fields}, last_sent_at=getattr(setting, "last_sent_at", None))
            validate_report_filters(setting.report_filters or {}, setting.min_score)
            validate_csv_columns(setting.csv_columns)
        recipients = recipient_override or setting.recipient_emails

        if not recipients:
            raise ValueError("No recipient emails configured for this report.")

        only_new = getattr(setting, "only_new_leads", True)
        last_sent = getattr(setting, "last_sent_at", None)
        raw_leads = cls.get_qualified_leads_query(
            db, workspace_id, setting.min_score, getattr(setting, "report_filters", None),
            only_new=only_new,
            last_sent_at=last_sent
        ).all()
        leads = cls.deduplicate_leads(raw_leads)
        lead_count = len(leads)

        date_slug = datetime.now().strftime("%Y-%m-%d")
        filename = f"qualified_leads_{date_slug}.csv"

        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        ws_name = ws.name if ws and ws.name else "OrbionAgents"

        content = cls.build_email_content(setting, lead_count, filename, ws_name)

        attachments = []
        if getattr(setting, "attach_csv", True) and lead_count > 0:
            flow_names = get_lead_flow_names(db, workspace_id, [lead.conversation_id for lead in leads]) if "flow_name" in validate_csv_columns(getattr(setting, "csv_columns", None)) else {}
            csv_bytes = cls.generate_csv_bytes(leads, getattr(setting, "csv_columns", None), cls.get_workspace_timezone(db, workspace_id), flow_names)
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
            for lead in leads:
                if hasattr(lead, "last_reported_at"):
                    lead.last_reported_at = now_utc
            setting.last_sent_at = now_utc
            tz_str = cls.get_workspace_timezone(db, workspace_id)
            setting.next_run_at = cls.calculate_next_run(
                setting.frequency,
                setting.send_times or [setting.send_time],
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
                        setting.send_times or [setting.send_time],
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
        only_new = getattr(setting, "only_new_leads", True)
        raw_leads = LeadEmailReportService.get_qualified_leads_query(
            db, workspace_id, setting.min_score, setting.report_filters,
            only_new=only_new,
            last_sent_at=setting.last_sent_at
        ).all()
        lead_count = len(cls.deduplicate_leads(raw_leads))

        return {
            "settings": {
                "id": str(setting.id),
                "workspace_id": str(setting.workspace_id),
                "is_active": setting.is_active,
                "min_score": setting.min_score,
                "frequency": setting.frequency,
                "send_time": setting.send_time,
                "send_times": setting.send_times or [setting.send_time],
                "timezone": cls.get_workspace_timezone(db, workspace_id),
                "recipient_emails": setting.recipient_emails or [],
                "attach_csv": setting.attach_csv,
                "only_new_leads": only_new,
                "report_filters": setting.report_filters or {},
                "csv_columns": setting.csv_columns,
                "subject_template": setting.subject_template or DEFAULT_SUBJECT_TEMPLATE,
                "body_template": setting.body_template or DEFAULT_BODY_TEMPLATE,
                "default_subject": DEFAULT_SUBJECT_TEMPLATE,
                "default_body": DEFAULT_BODY_TEMPLATE,
                "default_zero_leads_subject": DEFAULT_ZERO_LEADS_SUBJECT,
                "default_zero_leads_body": DEFAULT_ZERO_LEADS_BODY_TEMPLATE,
                "last_sent_at": setting.last_sent_at.isoformat() if setting.last_sent_at else None,
                "next_run_at": setting.next_run_at.isoformat() if setting.next_run_at else None,
            },
            "lead_count": lead_count,
            "csv_column_options": [{"key": key, "label": label} for key, label in CSV_COLUMNS],
        }

    @classmethod
    def sample_preview(cls, db, workspace_id, min_score, filters, columns, frequency, subject_template, body_template, only_new_leads: bool = True):
        import json
        try:
            report_filters = json.loads(filters) if isinstance(filters, str) else {}
            selected_columns = validate_csv_columns(json.loads(columns) if isinstance(columns, str) else None)
            setting = LeadEmailReportService.get_or_create_settings(db, workspace_id)
            query = LeadEmailReportService.get_qualified_leads_query(
                db, workspace_id, min_score, report_filters,
                only_new=only_new_leads,
                last_sent_at=setting.last_sent_at
            )
            raw_leads = query.all()
            deduped_leads = cls.deduplicate_leads(raw_leads)
            lead_count = len(deduped_leads)
            leads = deduped_leads[:10]
            flow_names = get_lead_flow_names(db, workspace_id, [lead.conversation_id for lead in leads]) if "flow_name" in selected_columns else {}
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

        from types import SimpleNamespace
        preview_setting = SimpleNamespace(
            min_score=min_score,
            frequency=frequency,
            only_new_leads=only_new_leads,
            last_sent_at=setting.last_sent_at,
            subject_template=setting.subject_template,
            body_template=setting.body_template
        )

        content = LeadEmailReportService.build_email_content(
            setting=preview_setting,
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
            "csv_rows": list(LeadEmailReportService.csv_rows(leads, selected_columns, LeadEmailReportService.get_workspace_timezone(db, workspace_id), flow_names)),
            "subject": content["subject"],
            "body_text": content["plain_text"],
            "html_body": content["html_body"],
            "filename": filename,
            "date_str": content["date_str"],
        }
