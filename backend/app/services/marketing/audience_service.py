import csv
import io
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.ai_action import Lead
from app.models.campaign import ContactList, ContactListMember

logger = logging.getLogger(__name__)


class AudienceService:
    @staticmethod
    def normalize_phone(phone_str: str, default_country_code: str = "91") -> Optional[str]:
        if not phone_str:
            return None

        # Strip all whitespace, dashes, parentheses
        cleaned = re.sub(r"[^\d+]", "", str(phone_str).strip())
        if not cleaned:
            return None

        if cleaned.startswith("+"):
            digits = cleaned[1:]
        elif cleaned.startswith("00"):
            digits = cleaned[2:]
        else:
            digits = cleaned

        # Strip leading zeroes from national number
        digits = digits.lstrip("0")

        # Basic length validation (international phone numbers are between 7 and 15 digits)
        if len(digits) == 10 and default_country_code:
            digits = f"{default_country_code}{digits}"

        if len(digits) < 7 or len(digits) > 15:
            return None

        return f"+{digits}"

    @classmethod
    def parse_csv_contacts(
        cls,
        file_content: bytes,
        default_country_code: str = "91"
    ) -> Dict[str, Any]:
        """
        Parses an uploaded CSV file containing contacts.
        Extracts Name, Phone, Email, and dynamic variables.
        """
        # Try multiple encodings
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
        if not reader.fieldnames:
            return {
                "total": 0,
                "valid_count": 0,
                "invalid_count": 0,
                "recipients": [],
                "invalid_sample": []
            }

        # Flexible alphanumeric header mapping
        field_map = {}
        for fn in reader.fieldnames:
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

        if not phone_key and reader.fieldnames:
            phone_key = reader.fieldnames[0]

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

        valid_recipients = []
        invalid_sample = []
        seen_phones = set()

        # If header itself is a phone number (headerless file)
        if phone_key:
            header_norm = cls.normalize_phone(phone_key, default_country_code=default_country_code)
            if header_norm:
                seen_phones.add(header_norm)
                valid_recipients.append({
                    "phone_number": phone_key,
                    "normalized_phone": header_norm,
                    "recipient_name": "",
                    "variables": {"phone": header_norm}
                })

        for idx, row in enumerate(reader, start=1):
            raw_phone = row.get(phone_key, "") if phone_key else ""
            norm_phone = cls.normalize_phone(raw_phone, default_country_code=default_country_code)

            name = (row.get(name_key, "") if name_key else "").strip()
            email = (row.get(email_key, "") if email_key else "").strip()

            if not norm_phone:
                if len(invalid_sample) < 20:
                    invalid_sample.append({
                        "row": idx,
                        "raw_phone": raw_phone,
                        "name": name,
                        "reason": "Invalid or missing phone format"
                    })
                continue

            # Deduplicate by normalized phone
            if norm_phone in seen_phones:
                if len(invalid_sample) < 20:
                    invalid_sample.append({
                        "row": idx,
                        "raw_phone": raw_phone,
                        "name": name,
                        "reason": "Duplicate phone number in CSV"
                    })
                continue

            seen_phones.add(norm_phone)

            # Collect dynamic variables from remaining columns
            variables = {}
            if name:
                variables["name"] = name
            if email:
                variables["email"] = email
            variables["phone"] = norm_phone

            for k, v in row.items():
                clean_k = re.sub(r"[^\w]", "_", k.strip().lower())
                if clean_k not in ["phone", "mobile", "contact", "whatsapp", "cell", "name", "email"]:
                    if v and v.strip():
                        variables[clean_k] = v.strip()

            valid_recipients.append({
                "phone_number": raw_phone,
                "normalized_phone": norm_phone,
                "recipient_name": name or None,
                "variables": variables
            })

        total = len(valid_recipients) + len(invalid_sample)
        return {
            "total": total,
            "valid_count": len(valid_recipients),
            "invalid_count": len(invalid_sample),
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
        query = db.query(Lead).filter(Lead.workspace_id == workspace_id)

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
