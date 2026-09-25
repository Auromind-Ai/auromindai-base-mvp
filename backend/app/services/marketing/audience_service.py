import csv
import io
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app.models.ai_action import Lead
from app.models.campaign import ContactList, ContactListMember
from app.models.conversation import Conversation, ChannelType

logger = logging.getLogger(__name__)


class AudienceService:
    @staticmethod
    def normalize_phone(phone_str: str, default_country_code: str = "91") -> Optional[str]:
        if not phone_str:
            return None

        raw_str = str(phone_str).strip()
        if not raw_str:
            return None

        # Check for multiple numbers / delimiters
        if re.search(r"[,;]", raw_str):
            return None

        has_plus = raw_str.startswith("+")
        has_double_zero = raw_str.startswith("00")

        # Strip all non-digit characters
        digits = re.sub(r"\D", "", raw_str)
        if not digits:
            return None

        # Repetitive dummy digits
        if len(set(digits)) == 1 and len(digits) >= 7:
            return None

        if has_double_zero:
            digits = digits[2:]
            has_plus = True

        # If explicit international prefix (+ or 00) was provided
        if has_plus:
            if len(digits) < 10 or len(digits) > 15:
                return None
            if digits.startswith("0"):
                return None
            if digits.startswith("91"):
                if len(digits) != 12 or digits[2] not in "6789":
                    return None
            return f"+{digits}"

        # Standard 10-digit number
        if len(digits) == 10:
            if default_country_code == "91":
                if digits[0] in "6789":
                    return f"+91{digits}"
                return None
            return f"+{default_country_code}{digits}"

        # 11-digit number starting with 0
        if len(digits) == 11 and raw_str.startswith("0"):
            national = digits[1:]
            if default_country_code == "91":
                if national[0] in "6789":
                    return f"+91{national}"
                return None
            return f"+{default_country_code}{national}"

        # 12-digit number starting with 91
        if len(digits) == 12 and digits.startswith("91"):
            if digits[2] in "6789":
                return f"+{digits}"
            return None

        # General international number without + (10 to 15 digits)
        if 10 <= len(digits) <= 15 and not digits.startswith("0"):
            if digits.startswith("91"):
                return None
            return f"+{digits}"

        return None

    @classmethod
    def parse_csv_contacts(
        cls,
        file_content: bytes,
        default_country_code: str = "91",
        filename: str = "",
    ) -> Dict[str, Any]:
        """
        Parses an uploaded CSV or Excel (.xlsx, .xls) file containing contacts.
        Extracts Name, Phone, Email, and dynamic variables.
        """
        is_excel = False
        if filename and any(filename.lower().endswith(ext) for ext in [".xlsx", ".xls"]):
            is_excel = True
        elif file_content.startswith(b"PK\x03\x04") or file_content.startswith(b"\xd0\xcf\x11\xe0"):
            is_excel = True

        fieldnames = []
        rows = []

        if is_excel:
            try:
                import openpyxl
                wb = openpyxl.load_workbook(io.BytesIO(file_content), data_only=True, read_only=True)
                sheet = wb.active
                raw_rows = list(sheet.iter_rows(values_only=True))
                if raw_rows:
                    header_row = raw_rows[0]
                    fieldnames = [str(c).strip() for c in header_row if c is not None and str(c).strip()]
                    for r in raw_rows[1:]:
                        if not any(v is not None and str(v).strip() for v in r):
                            continue
                        row_dict = {}
                        for idx, col_name in enumerate(fieldnames):
                            val = r[idx] if idx < len(r) else ""
                            if isinstance(val, float) and val.is_integer():
                                val = str(int(val))
                            elif val is not None:
                                val = str(val).strip()
                            else:
                                val = ""
                            row_dict[col_name] = val
                        rows.append(row_dict)
            except Exception as e:
                logger.warning(f"openpyxl failed to parse excel, attempting pandas fallback: {e}")
                try:
                    import pandas as pd
                    df = pd.read_excel(io.BytesIO(file_content))
                    fieldnames = [str(c).strip() for c in df.columns]
                    for _, s_row in df.iterrows():
                        row_dict = {}
                        for col in fieldnames:
                            val = s_row[col]
                            if pd.isna(val):
                                val = ""
                            elif isinstance(val, float) and val.is_integer():
                                val = str(int(val))
                            else:
                                val = str(val).strip()
                            row_dict[col] = val
                        rows.append(row_dict)
                except Exception as e2:
                    logger.error(f"Failed to parse excel file: {e2}")
                    return {
                        "total": 0,
                        "valid_count": 0,
                        "invalid_count": 0,
                        "recipients": [],
                        "invalid_sample": [{
                            "row": 0,
                            "raw_phone": "",
                            "name": "",
                            "reason": f"Failed to parse Excel file: {str(e2)}"
                        }]
                    }
        else:
            # Try multiple encodings for CSV
            text_content = ""
            for enc in ["utf-8-sig", "utf-8", "latin1", "cp1252"]:
                try:
                    text_content = file_content.decode(enc)
                    break
                except Exception:
                    continue
            if not text_content:
                text_content = file_content.decode("utf-8", errors="replace")

            # Detect delimiter (comma, semicolon, tab)
            delimiter = ","
            first_line = text_content.strip().split("\n")[0] if text_content.strip() else ""
            if ";" in first_line and first_line.count(";") > first_line.count(","):
                delimiter = ";"
            elif "\t" in first_line and first_line.count("\t") > first_line.count(","):
                delimiter = "\t"

            reader = csv.DictReader(io.StringIO(text_content), delimiter=delimiter)
            fieldnames = list(reader.fieldnames or [])
            rows = list(reader)

        if not fieldnames:
            return {
                "total": 0,
                "valid_count": 0,
                "invalid_count": 0,
                "recipients": [],
                "invalid_sample": []
            }

        # Flexible alphanumeric header mapping
        field_map = {}
        for fn in fieldnames:
            if fn:
                clean = re.sub(r"[^a-z0-9]", "", str(fn).strip().lower())
                field_map[clean] = fn

        # Detect phone column
        phone_key = None
        for clean_name, orig in field_map.items():
            if any(k in clean_name for k in ["phone", "mobile", "whatsapp", "contact", "cell", "tel"]):
                phone_key = orig
                break
        if not phone_key:
            for clean_name, orig in field_map.items():
                if any(k in clean_name for k in ["number", "num"]):
                    phone_key = orig
                    break

        if not phone_key and fieldnames:
            phone_key = fieldnames[0]

        # Detect name column
        name_key = None
        for clean_name, orig in field_map.items():
            if any(k in clean_name for k in ["name", "fullname", "firstname", "customer", "lead", "client", "user"]):
                name_key = orig
                break

        # Detect email column
        email_key = None
        for clean_name, orig in field_map.items():
            if any(k in clean_name for k in ["email", "mail"]):
                email_key = orig
                break

        # Detect opt-out column
        opt_out_key = None
        for clean_name, orig in field_map.items():
            if any(k in clean_name for k in ["optout", "opt_out", "optedout", "opted_out", "unsubscribe", "unsubscribed", "dnd", "block"]):
                opt_out_key = orig
                break

        valid_recipients = []
        invalid_sample = []
        invalid_count = 0
        duplicate_count = 0
        opted_out_count = 0
        seen_phones = set()

        for idx, row in enumerate(rows, start=1):
            # Check for completely empty row
            if not any(str(v).strip() for v in row.values() if v is not None):
                continue

            raw_phone = row.get(phone_key, "") if phone_key else ""
            norm_phone = cls.normalize_phone(raw_phone, default_country_code=default_country_code)

            name = (row.get(name_key, "") if name_key else "").strip()
            email = (row.get(email_key, "") if email_key else "").strip()

            if not norm_phone:
                invalid_count += 1
                if len(invalid_sample) < 25:
                    invalid_sample.append({
                        "row": idx,
                        "raw_phone": raw_phone,
                        "name": name,
                        "reason": "Invalid or missing phone number format"
                    })
                continue

            # Deduplicate by normalized phone
            if norm_phone in seen_phones:
                duplicate_count += 1
                if len(invalid_sample) < 25:
                    invalid_sample.append({
                        "row": idx,
                        "raw_phone": raw_phone,
                        "name": name,
                        "reason": "Duplicate phone number in CSV"
                    })
                continue

            seen_phones.add(norm_phone)

            # Check opt-out state
            is_opted_out = False
            if opt_out_key:
                raw_opt = str(row.get(opt_out_key, "")).strip().lower()
                if raw_opt in ("true", "1", "yes", "y", "optout", "opt_out", "opted_out", "unsubscribed"):
                    is_opted_out = True
                    opted_out_count += 1

            # Preserve all original column values by their exact CSV header name
            variables = {}
            for k, v in row.items():
                if k and str(k).strip():
                    orig_key = str(k).strip()
                    val_str = str(v).strip() if v is not None else ""
                    variables[orig_key] = val_str
                    clean_k = re.sub(r"[^\w]", "_", orig_key.lower())
                    variables[clean_k] = val_str

            if name:
                variables["name"] = name
            if email:
                variables["email"] = email
            if norm_phone:
                variables["phone"] = norm_phone
            if is_opted_out:
                variables["opt_out"] = True

            valid_recipients.append({
                "phone_number": raw_phone,
                "normalized_phone": norm_phone,
                "recipient_name": name or None,
                "is_opted_out": is_opted_out,
                "variables": variables
            })

        headers = [str(f).strip() for f in fieldnames if f and str(f).strip()]
        total = len(valid_recipients) + invalid_count + duplicate_count
        usable_count = len([r for r in valid_recipients if not r.get("is_opted_out")])

        return {
            "total": total,
            "valid_count": len(valid_recipients),
            "usable_count": usable_count,
            "invalid_count": invalid_count + duplicate_count,
            "malformed_count": invalid_count,
            "duplicate_count": duplicate_count,
            "opted_out_count": opted_out_count,
            "headers": headers,
            "recipients": valid_recipients,
            "invalid_sample": invalid_sample
        }

    @classmethod
    def get_crm_contacts(
        cls,
        db: Session,
        workspace_id: Any,
        contact_list_id: Optional[Any] = None,
        default_country_code: str = "91"
    ) -> List[Dict[str, Any]]:
        query = (
            db.query(Lead)
            .outerjoin(Conversation, Lead.conversation_id == Conversation.id)
            .filter(
                Lead.workspace_id == workspace_id,
                Lead.phone.isnot(None),
                func.length(func.trim(Lead.phone)) >= 7,
                ~func.lower(func.coalesce(Lead.source, "")).like("%instagram%"),
                ~func.lower(func.coalesce(Lead.source, "")).like("%gmail%"),
                ~func.lower(func.coalesce(Lead.source, "")).like("%email%"),
                func.lower(func.coalesce(Lead.source, "")) != "ig",
                or_(
                    Lead.conversation_id.is_(None),
                    and_(
                        Conversation.channel != ChannelType.INSTAGRAM,
                        Conversation.channel != ChannelType.EMAIL,
                    ),
                ),
            )
        )

        if contact_list_id:
            query = query.join(
                ContactListMember,
                ContactListMember.lead_id == Lead.id
            ).filter(ContactListMember.contact_list_id == contact_list_id)

        leads = query.all()
        recipients = []
        seen_phones = set()

        for lead in leads:
            raw_phone = lead.phone or lead.normalized_phone or ""
            norm_phone = cls.normalize_phone(raw_phone, default_country_code=default_country_code)
            if not norm_phone or norm_phone in seen_phones:
                continue

            seen_phones.add(norm_phone)

            vars_dict = {
                "name": lead.name or "Valued Customer",
                "phone": norm_phone,
                "email": lead.email or "",
                "company": lead.company or "",
            }
            if lead.custom_fields and isinstance(lead.custom_fields, dict):
                vars_dict.update(lead.custom_fields)

            recipients.append({
                "lead_id": lead.id,
                "phone_number": raw_phone,
                "normalized_phone": norm_phone,
                "recipient_name": lead.name,
                "variables": vars_dict
            })

        return recipients


normalize_phone = AudienceService.normalize_phone
