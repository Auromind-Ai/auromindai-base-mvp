import csv
import io
from datetime import datetime
from openpyxl import Workbook
from tempfile import SpooledTemporaryFile

from sqlalchemy import and_, case, func
from app.models.ai_action import Lead
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.services.crm.lead_query import lead_query, signal_active, source_expression
from app.utils.scoring_config import get_scoring_config

EXPORT_COLUMNS = {
    "name": "Name", "phone": "Phone", "email": "Email", "source": "Source",
    "score": "Lead Score", "lead_tier": "Tier", "status": "Status",
    "intent_signals": "Buying Intent", "assigned_agent": "Assigned Agent",
    "created_at": "Created Date", "last_activity_at": "Last Activity",
    "conversion_amount": "Deal Value", "converted_product": "Product / Service",
    "labels": "Labels", "converted_at": "Converted Date",
}


def analytics(db, workspace_id, filters, user_id):
    q = lead_query(db, workspace_id, filters, user_id)
    qualified = Lead.lead_tier.in_(["warm", "hot"])
    def count_if(condition):
        return func.coalesce(func.sum(case((condition, 1), else_=0)), 0)
    metrics = [func.count(Lead.id), count_if(qualified), count_if(Lead.lead_tier == "hot"),
               count_if(Lead.is_converted.is_(True)),
               func.coalesce(func.sum(case((Lead.is_converted.is_(True), Lead.conversion_amount), else_=0)), 0)]
    row = q.with_entities(*metrics).one()
    result = dict(zip(["total", "qualified", "hot", "converted", "revenue"], row))
    result["revenue"] = float(result["revenue"])
    result["conversion_rate"] = round(100 * result["converted"] / result["total"], 1) if result["total"] else 0
    result["sources"] = [dict(source=r[0], total=r[1], qualified=r[2], hot=r[3], converted=r[4], revenue=float(r[5]))
                         for r in q.with_entities(source_expression(), *metrics).group_by(source_expression()).all()]
    bands = [(0, 29), (30, 49), (50, 69), (70, 89), (90, 100)]
    values = q.with_entities(*[count_if(func.coalesce(Lead.score, 0).between(a, b)) for a, b in bands]).one()
    result["distribution"] = [{"label": f"{a}–{b}", "count": values[i]} for i, (a, b) in enumerate(bands)]
    keys = list(get_scoring_config().get_weights())
    counts = q.with_entities(*[count_if(signal_active(key)) for key in keys]).one()
    result["intents"] = [{"key": key, "count": counts[i]} for i, key in enumerate(keys)]
    result["qualified_definition"] = "Qualified leads have a Warm or Hot tier from the existing lead scoring system."
    return result


def safe_cell(value):
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        value = ", ".join(map(str, value))
    if isinstance(value, dict):
        value = ", ".join(k.replace("_", " ") for k, v in value.items()
                          if v is True or isinstance(v, dict) and v.get("value") is True)
    # Keep untrusted contact data from becoming spreadsheet formulas.
    if isinstance(value, str) and (value.lstrip().startswith(("=", "+", "-", "@")) or value.startswith(("\t", "\r", "\n"))):
        return "'" + value
    return value


def export_file(query, columns, format):
    if any(c not in EXPORT_COLUMNS for c in columns) or len(set(columns)) != len(columns):
        raise ValueError("Choose valid, unique export fields")
    fields = [User.full_name if c == "assigned_agent" else getattr(Lead, c) for c in columns]
    rows = (query.outerjoin(WorkspaceMember, and_(WorkspaceMember.user_id == Lead.assigned_to,
                         WorkspaceMember.workspace_id == Lead.workspace_id))
            .outerjoin(User, User.id == WorkspaceMember.user_id)
            .with_entities(*fields).order_by(Lead.id).yield_per(1000))
    output = SpooledTemporaryFile(max_size=4 * 1024 * 1024, mode="w+b")
    try:
        if format == "csv":
            text = io.TextIOWrapper(output, encoding="utf-8-sig", newline="")
            writer = csv.writer(text)
            writer.writerow([EXPORT_COLUMNS[c] for c in columns])
            for row in rows:
                writer.writerow([safe_cell(v) for v in row])
            text.flush()
            text.detach()
        else:
            book = Workbook(write_only=True)
            sheet = book.create_sheet("Leads")
            sheet.append([EXPORT_COLUMNS[c] for c in columns])
            for index, row in enumerate(rows, start=2):
                if index > 1048576:
                    raise ValueError("Excel supports up to 1,048,575 leads. Use CSV or narrow your filters.")
                sheet.append([safe_cell(v) for v in row])
            book.save(output)
            book.close()
        output.seek(0)
        return output
    except Exception:
        output.close()
        raise
