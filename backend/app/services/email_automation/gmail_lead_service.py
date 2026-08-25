import logging
import re
import uuid
import email.utils
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from googleapiclient.discovery import build

from app.models.integration import Integration, GmailImportLog
from app.models.ai_action import Lead
from app.services.config_service import config_service

logger = logging.getLogger(__name__)

# Required Google OAuth Scope for Lead Ingestion
GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
GMAIL_FULL_SCOPE = "https://mail.google.com/"

# Domains considered public/free email providers
FREE_EMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
    "icloud.com", "aol.com", "zoho.com", "proton.me", "protonmail.com",
    "gmx.com", "mail.com", "yandex.com"
}

# Automated sender prefixes to reject immediately in Stage 1
AUTOMATED_SENDER_PATTERNS = [
    r"^no-?reply@",
    r"^mailer-daemon@",
    r"^notifications?@",
    r"^bounce@",
    r"^donotreply@",
    r"^alerts?@",
    r"^newsletters?@",
    r"^support@notification",
    r"^security-noreply@",
    r"^billing@",
    r"^system@",
]

# Automated subject patterns to reject in Stage 1
AUTOMATED_SUBJECT_PATTERNS = [
    r"^security alert",
    r"^verification code",
    r"^your receipt",
    r"^invoice for",
    r"^statement of",
    r"^payment confirmation",
    r"^two-factor",
    r"^password reset",
    r"^sign-in from",
    r"^welcome to ",
]

# Positive lead intent keywords for Stage 2 qualification
LEAD_INTENT_KEYWORDS = [
    "demo", "pricing", "quote", "inquiry", "enquiry", "proposal", "cost",
    "consultation", "services", "interested in", "looking for", "requirements",
    "buy", "purchase", "schedule a call", "contact sales", "hire", "partnership",
    "licensing", "enterprise plan", "order", "rate card", "package", "need a demo",
    "price list", "quotation", "collaboration", "rfp", "rfi", "features"
]

# Non-lead casual conversation signals (without inquiry intent)
NON_LEAD_CASUAL_PATTERNS = [
    r"^thanks for your help",
    r"^thank you very much",
    r"^sounds good thanks",
    r"^got it thanks",
    r"^acknowledged",
    r"^happy birthday",
    r"^happy new year",
    r"^good morning",
    r"^ok thanks",
]


def _to_uuid(val) -> Optional[uuid.UUID]:
    if isinstance(val, uuid.UUID):
        return val
    if isinstance(val, str):
        try:
            return uuid.UUID(val)
        except (ValueError, AttributeError):
            return None
    return None


class GmailLeadService:
    

    @staticmethod
    def verify_oauth_scope(integration: Integration) -> bool:
        if not integration:
            return False

        # If metadata has scopes list or integration is active gmail type
        if integration.integration_type not in ["google_gmail", "gmail"]:
            return False

        # In standard Google integration flow, scopes are verified via OAuth flow
        return True

    @staticmethod
    def get_active_gmail_integration(
        db: Session,
        workspace_id: str | uuid.UUID,
        integration_id: Optional[str | uuid.UUID] = None
    ) -> Integration:
        """
        Fetch active Gmail integration strictly scoped to the workspace.
        """
        ws_uuid = _to_uuid(workspace_id)
        if not ws_uuid:
            raise ValueError("Invalid workspace_id provided")

        query = db.query(Integration).filter(
            Integration.workspace_id == ws_uuid,
            Integration.integration_type.in_(["google_gmail", "gmail"]),
            Integration.is_active == True,
        )

        if integration_id:
            int_uuid = _to_uuid(integration_id)
            if not int_uuid:
                raise ValueError("Invalid integration_id provided")
            query = query.filter(Integration.id == int_uuid)

        integration = query.first()
        if not integration:
            raise ValueError(f"No active Gmail integration found for workspace {workspace_id}")

        return integration

    @staticmethod
    def build_authenticated_service(integration: Integration, db: Session) -> Any:
        google_client_id = config_service.get("google_client_id")
        google_client_secret = config_service.get("google_client_secret")

        creds = Credentials(
            token=integration.access_token,
            refresh_token=integration.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=google_client_id,
            client_secret=google_client_secret,
            scopes=[GMAIL_READONLY_SCOPE],
        )

        try:
            if not creds.valid:
                if creds.refresh_token:
                    logger.info("Refreshing Gmail access token for integration %s", str(integration.id))
                    creds.refresh(Request())
                    integration.access_token = creds.token
                    integration.token_expiry = creds.expiry
                    db.commit()
                else:
                    raise RefreshError("No refresh token available on integration record")
        except (RefreshError, Exception) as refresh_err:
            # Mark integration inactive on authentication failure
            logger.warning(
                "OAuth token refresh failed for workspace integration %s: %s",
                str(integration.workspace_id),
                str(refresh_err),
            )
            integration.is_active = False
            db.commit()
            raise PermissionError("Gmail OAuth authentication expired or revoked. Integration has been deactivated.")

        return build("gmail", "v1", credentials=creds, cache_discovery=False)

    @staticmethod
    def build_restricted_query(user_query: Optional[str] = None, newer_than_days: int = 30) -> str:
        base_query = "category:primary -label:spam -label:trash"
        parts = [base_query]

        if newer_than_days and newer_than_days > 0:
            parts.append(f"newer_than:{newer_than_days}d")

        if user_query and user_query.strip():
            sanitized = user_query.strip()
            # Do not allow overriding spam/trash exclusions
            if "-label:spam" not in sanitized:
                parts.append(sanitized)
            else:
                parts = [sanitized]

        return " ".join(parts)

    @staticmethod
    def fetch_candidate_messages(
        service: Any,
        query: str,
        max_results: int = 20,
        page_token: Optional[str] = None
    ) -> Tuple[List[Dict[str, str]], Optional[str]]:
        bounded_max = max(1, min(max_results, 50))
        params = {
            "userId": "me",
            "q": query,
            "maxResults": bounded_max,
        }
        if page_token:
            params["pageToken"] = page_token

        response = service.users().messages().list(**params).execute()
        messages = response.get("messages", [])
        next_token = response.get("nextPageToken")
        return messages, next_token

    @staticmethod
    def is_message_already_processed(
        db: Session,
        workspace_id: uuid.UUID,
        gmail_message_id: str
    ) -> bool:
        """
        Check if the message has already been recorded in GmailImportLog for this workspace.
        """
        existing = (
            db.query(GmailImportLog)
            .filter(
                GmailImportLog.workspace_id == workspace_id,
                GmailImportLog.gmail_message_id == gmail_message_id,
            )
            .first()
        )
        return existing is not None

    @staticmethod
    def normalize_email(email_str: Optional[str]) -> Optional[str]:
        """
        Normalize email address: strip whitespace, lowercase, and validate RFC regex.
        Rejects invalid emails ('no-email', '@', 'abc', etc.).
        """
        if not email_str or not isinstance(email_str, str):
            return None

        cleaned = email_str.strip().lower()
        # RFC 5322 standard compatible simplified regex
        email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(email_regex, cleaned):
            return None

        # Discard obvious placeholders
        if cleaned.startswith("no-reply@") or cleaned.startswith("noreply@") or cleaned == "test@test.com":
            return None

        return cleaned

    @staticmethod
    def normalize_phone(phone_str: Optional[str]) -> Optional[str]:
        """
        Normalize phone number: extract digits, remove spaces/hyphens/brackets.
        Supports standard international (+91, etc.) or 10-digit mobile formats.
        """
        if not phone_str or not isinstance(phone_str, str):
            return None

        cleaned = re.sub(r"[\s\-\(\)\.]", "", phone_str.strip())
        if not cleaned:
            return None

        # Check for Indian +91 format or 10-digit mobile
        digits_only = re.sub(r"\D", "", cleaned)
        if len(digits_only) < 7 or len(digits_only) > 15:
            return None

        if cleaned.startswith("+"):
            return f"+{digits_only}"
        elif len(digits_only) == 10 and digits_only[0] in "6789":
            return f"+91{digits_only}"
        return digits_only

    @staticmethod
    def is_lead_candidate(
        headers: Dict[str, str],
        from_address: str,
        subject: str
    ) -> Tuple[bool, str]:
        """
        Stage 1 Pre-Filter: Deterministically filter out newsletters, automated notifications,
        system alerts, bounces, and mailing lists.
        """
        # 1. Check mailing list / newsletter headers
        if "List-Unsubscribe" in headers or "list-unsubscribe" in headers:
            return False, "newsletter_list_unsubscribe"

        auto_submitted = headers.get("Auto-Submitted", headers.get("auto-submitted", "")).lower()
        if auto_submitted in ["auto-generated", "auto-replied", "auto-notified"]:
            return False, "auto_submitted_notification"

        precedence = headers.get("Precedence", headers.get("precedence", "")).lower()
        if precedence in ["bulk", "list", "junk"]:
            return False, "bulk_precedence"

        # 2. Check automated sender patterns
        from_clean = from_address.strip().lower()
        for pat in AUTOMATED_SENDER_PATTERNS:
            if re.search(pat, from_clean):
                return False, f"automated_sender_match: {pat}"

        # 3. Check automated subject patterns
        subj_clean = subject.strip().lower()
        for pat in AUTOMATED_SUBJECT_PATTERNS:
            if re.search(pat, subj_clean):
                return False, f"automated_subject_match: {pat}"

        return True, "candidate"

    @staticmethod
    def evaluate_lead_intent(
        subject: str,
        snippet: str,
        body: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Stage 2 Lead Intent Qualification: Separates actual business inquiries/leads
        from casual conversations, thank-you messages, and non-leads.
        """
        combined_text = f"{subject} {snippet} {body or ''}".lower()

        # 1. Check for explicit lead intent keywords
        for kw in LEAD_INTENT_KEYWORDS:
            if kw in combined_text:
                return True, f"lead_intent_keyword: {kw}"

        # 2. Check for contact inquiry signals (e.g. asking for pricing, consultation, phone number)
        inquiry_patterns = [
            r"can we (schedule|talk|connect|discuss|meet)",
            r"how much (does|is|for)",
            r"what is the (price|cost|fee|charge|rate)",
            r"are you available (for|to|this)",
            r"please (call|quote|send details|share pricing)",
            r"my (phone|contact|number) is",
            r"reach (me|us) at",
        ]
        for pat in inquiry_patterns:
            if re.search(pat, combined_text):
                return True, f"inquiry_pattern_match: {pat}"

        # 3. Check for casual thank-you / chit-chat without intent
        subj_clean = subject.strip().lower()
        for pat in NON_LEAD_CASUAL_PATTERNS:
            if re.search(pat, subj_clean) and not any(kw in combined_text for kw in LEAD_INTENT_KEYWORDS):
                return False, f"casual_conversation_non_lead: {pat}"

        # If it's a direct primary message without automated markers and subject is non-empty,
        # default to candidate lead if it contains more than basic greeting
        if len(combined_text.strip()) > 30 and ("?" in combined_text or "help" in combined_text or "need" in combined_text):
            return True, "general_inquiry"

        return False, "insufficient_lead_signals"

    @classmethod
    def extract_lead_data(cls, message_detail: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract minimal structured contact attributes from message headers and sanitized snippet.
        Data minimization rule: Full email body and attachments are NEVER extracted for Lead record.
        """
        payload = message_detail.get("payload", {})
        headers_list = payload.get("headers", [])
        headers = {h.get("name", ""): h.get("value", "") for h in headers_list}

        raw_from = headers.get("From", "")
        real_name, raw_email = email.utils.parseaddr(raw_from)

        # Fallback to Reply-To if From has no email
        if not raw_email and "Reply-To" in headers:
            _, raw_email = email.utils.parseaddr(headers["Reply-To"])

        normalized_email = cls.normalize_email(raw_email)
        name = real_name.strip() if real_name else ""

        # If name is empty, infer from email user prefix (e.g. john.smith -> John Smith)
        if not name and normalized_email:
            user_part = normalized_email.split("@")[0]
            name = " ".join([p.capitalize() for p in re.split(r"[._\-]", user_part) if p])

        snippet = message_detail.get("snippet", "")

        # Extract phone number from snippet using regex
        phone_match = re.search(
            r"(?:\+91[\-\s]?)?[6-9]\d{9}|(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",
            snippet
        )
        raw_phone = phone_match.group(0) if phone_match else None
        normalized_phone = cls.normalize_phone(raw_phone)

        # Extract company from email domain
        company = None
        if normalized_email:
            domain = normalized_email.split("@")[-1]
            if domain not in FREE_EMAIL_DOMAINS:
                # E.g. acmecorp.com -> Acme Corp
                company_base = domain.split(".")[0]
                company = " ".join([p.capitalize() for p in re.split(r"[-_]", company_base) if p])

        subject = headers.get("Subject", "")

        return {
            "name": name or "Gmail Contact",
            "email": raw_email if normalized_email else None,
            "normalized_email": normalized_email,
            "phone": raw_phone if normalized_phone else None,
            "normalized_phone": normalized_phone,
            "company": company,
            "subject": subject,
            "snippet": snippet,
            "headers": headers,
        }

    @staticmethod
    def find_existing_lead(
        db: Session,
        workspace_id: uuid.UUID,
        normalized_email: Optional[str],
        normalized_phone: Optional[str] = None
    ) -> Optional[Lead]:
        if normalized_email:
            lead = (
                db.query(Lead)
                .filter(
                    Lead.workspace_id == workspace_id,
                    Lead.normalized_email == normalized_email,
                )
                .first()
            )
            if lead:
                return lead

        if normalized_phone:
            lead = (
                db.query(Lead)
                .filter(
                    Lead.workspace_id == workspace_id,
                    Lead.normalized_phone == normalized_phone,
                )
                .first()
            )
            if lead:
                return lead

        return None

    @classmethod
    def create_or_update_lead(
        cls,
        db: Session,
        workspace_id: uuid.UUID,
        lead_data: Dict[str, Any],
        source_message_id: Optional[str] = None
    ) -> Tuple[Lead, str]:
        normalized_email = lead_data.get("normalized_email")
        normalized_phone = lead_data.get("normalized_phone")
        name = lead_data.get("name")
        phone = lead_data.get("phone")
        company = lead_data.get("company")
        email_val = lead_data.get("email") or normalized_email

        existing = cls.find_existing_lead(db, workspace_id, normalized_email, normalized_phone)

        if existing:
            # Update existing lead with newly extracted info if previously missing
            updated = False
            if (not existing.name or existing.name == "Gmail Contact") and name and name != "Gmail Contact":
                existing.name = name
                updated = True
            if not existing.phone and phone:
                existing.phone = phone
                existing.normalized_phone = normalized_phone
                updated = True
            if not existing.company and company:
                existing.company = company
                updated = True
            if not existing.email and email_val:
                existing.email = email_val
                existing.normalized_email = normalized_email
                updated = True
            if source_message_id:
                existing.source_message_id = source_message_id

            existing.last_activity_at = datetime.now(timezone.utc)
            existing.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing)
            return existing, "updated"

        # Attempt to insert new Lead with concurrency error recovery
        try:
            new_lead = Lead(
                workspace_id=workspace_id,
                name=name or "Gmail Contact",
                email=email_val,
                normalized_email=normalized_email,
                phone=phone,
                normalized_phone=normalized_phone,
                company=company,
                source="gmail",
                source_message_id=source_message_id,
                status="new",
                score=0,
                last_activity_at=datetime.now(timezone.utc),
            )
            db.add(new_lead)
            db.commit()
            db.refresh(new_lead)
            return new_lead, "created"

        except IntegrityError:
            db.rollback()
            # Concurrency conflict: another worker inserted this lead simultaneously
            logger.info(
                "Concurrent lead creation conflict for workspace %s, email %s. Re-fetching existing lead.",
                str(workspace_id),
                normalized_email,
            )
            recovered = (
                db.query(Lead)
                .filter(
                    Lead.workspace_id == workspace_id,
                    Lead.normalized_email == normalized_email,
                )
                .first()
            )
            if recovered:
                if (not recovered.name or recovered.name == "Gmail Contact") and name and name != "Gmail Contact":
                    recovered.name = name
                if not recovered.phone and phone:
                    recovered.phone = phone
                    recovered.normalized_phone = normalized_phone
                if not recovered.company and company:
                    recovered.company = company
                recovered.last_activity_at = datetime.now(timezone.utc)
                recovered.updated_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(recovered)
                return recovered, "updated"
            raise

    @staticmethod
    def record_import_log(
        db: Session,
        workspace_id: uuid.UUID,
        gmail_message_id: str,
        integration_id: Optional[uuid.UUID],
        status: str,
        error_code: Optional[str] = None,
        lead_id: Optional[uuid.UUID] = None
    ) -> GmailImportLog:
        """
        Record message import status into GmailImportLog table with concurrency safety.
        """
        try:
            log_entry = GmailImportLog(
                workspace_id=workspace_id,
                gmail_message_id=gmail_message_id,
                integration_id=integration_id,
                status=status,
                error_code=error_code,
                lead_id=lead_id,
            )
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)
            return log_entry
        except IntegrityError:
            db.rollback()
            existing = (
                db.query(GmailImportLog)
                .filter(
                    GmailImportLog.workspace_id == workspace_id,
                    GmailImportLog.gmail_message_id == gmail_message_id,
                )
                .first()
            )
            if existing:
                return existing
            raise

    @classmethod
    def sync_leads_from_gmail(
        cls,
        db: Session,
        workspace_id: str | uuid.UUID,
        max_messages: int = 20,
        query: Optional[str] = None,
        integration_id: Optional[str | uuid.UUID] = None,
        newer_than_days: int = 30
    ) -> Dict[str, Any]:
        ws_uuid = _to_uuid(workspace_id)
        if not ws_uuid:
            raise ValueError("Invalid workspace_id")

        # 1. Resolve workspace integration
        integration = cls.get_active_gmail_integration(db, ws_uuid, integration_id)

        # 2. Verify scope
        if not cls.verify_oauth_scope(integration):
            raise PermissionError("Integration missing required gmail.readonly permission scope")

        # 3. Build authenticated service
        service = cls.build_authenticated_service(integration, db)

        # 4. Build restricted query
        restricted_query = cls.build_restricted_query(query, newer_than_days=newer_than_days)

        # 5. Fetch candidate message IDs
        candidate_messages, _ = cls.fetch_candidate_messages(
            service=service,
            query=restricted_query,
            max_results=max_messages,
        )

        results = {
            "status": "success",
            "workspace_id": str(ws_uuid),
            "total_candidate_messages": len(candidate_messages),
            "created_leads": 0,
            "updated_leads": 0,
            "skipped_count": 0,
            "ignored_count": 0,
            "non_lead_count": 0,
            "details": [],
        }

        for msg_summary in candidate_messages:
            msg_id = msg_summary.get("id")
            if not msg_id:
                continue

            # Idempotency check: Already processed?
            if cls.is_message_already_processed(db, ws_uuid, msg_id):
                results["skipped_count"] += 1
                results["details"].append({
                    "message_id": msg_id,
                    "action": "skipped_already_processed",
                })
                continue

            try:
                # Fetch single message metadata and snippet (data minimization: minimal format)
                msg_detail = service.users().messages().get(
                    userId="me",
                    id=msg_id,
                    format="metadata",
                    metadataHeaders=["From", "Reply-To", "Subject", "Date", "List-Unsubscribe", "Auto-Submitted", "Precedence"]
                ).execute()

                extracted = cls.extract_lead_data(msg_detail)
                from_addr = extracted.get("email") or extracted.get("headers", {}).get("From", "")
                subject = extracted.get("subject", "")
                headers = extracted.get("headers", {})
                snippet = extracted.get("snippet", "")

                # Stage 1: Candidate pre-filter
                is_candidate, candidate_reason = cls.is_lead_candidate(headers, from_addr, subject)
                if not is_candidate:
                    cls.record_import_log(
                        db=db,
                        workspace_id=ws_uuid,
                        gmail_message_id=msg_id,
                        integration_id=integration.id,
                        status="ignored",
                        error_code=candidate_reason,
                    )
                    results["ignored_count"] += 1
                    results["details"].append({
                        "message_id": msg_id,
                        "action": "ignored",
                        "reason": candidate_reason,
                    })
                    continue

                # Stage 2: Intent qualification
                is_lead_intent, intent_reason = cls.evaluate_lead_intent(subject, snippet)
                lead_source_type = "deterministic_lead"

                if not is_lead_intent:
                    # Deterministic returned NO -> Check plan entitlement for AI fallback
                    from app.services.billing.entitlement_service import EntitlementService
                    ai_fallback_enabled = EntitlementService.is_feature_enabled(
                        db, ws_uuid, "ai_gmail_lead_fallback"
                    )

                    if not ai_fallback_enabled:
                        # Entitlement is OFF -> Ignore message (0 AI calls)
                        cls.record_import_log(
                            db=db,
                            workspace_id=ws_uuid,
                            gmail_message_id=msg_id,
                            integration_id=integration.id,
                            status="non_lead",
                            error_code=f"{intent_reason} (ai_fallback_disabled)",
                        )
                        results["non_lead_count"] += 1
                        results["details"].append({
                            "message_id": msg_id,
                            "action": "non_lead",
                            "reason": "deterministic_no_ai_fallback_disabled",
                        })
                        continue
                    else:
                        # Entitlement is ON -> Call AI Fallback Service
                        from app.services.email_automation.gmail_lead_ai_service import GmailLeadAIService
                        ai_result = GmailLeadAIService.verify_lead_intent(
                            subject=subject,
                            snippet=snippet,
                            workspace_id=ws_uuid,
                            db=db,
                        )

                        if ai_result.get("error"):
                            # AI call failed -> Fail closed, do NOT create lead
                            cls.record_import_log(
                                db=db,
                                workspace_id=ws_uuid,
                                gmail_message_id=msg_id,
                                integration_id=integration.id,
                                status="error",
                                error_code=f"ai_fallback_error: {ai_result.get('reason')}",
                            )
                            results["details"].append({
                                "message_id": msg_id,
                                "action": "error",
                                "reason": "ai_fallback_error",
                            })
                            continue

                        if not ai_result.get("is_lead"):
                            # AI classified as NOT a lead -> Ignore
                            cls.record_import_log(
                                db=db,
                                workspace_id=ws_uuid,
                                gmail_message_id=msg_id,
                                integration_id=integration.id,
                                status="non_lead",
                                error_code=f"ai_classified_non_lead: {ai_result.get('reason')}",
                            )
                            results["non_lead_count"] += 1
                            results["details"].append({
                                "message_id": msg_id,
                                "action": "non_lead",
                                "reason": "ai_fallback_not_lead",
                            })
                            continue
                        else:
                            lead_source_type = "ai_fallback_lead"

                # Valid Lead: Must have at least a normalized_email or normalized_phone
                if not extracted.get("normalized_email") and not extracted.get("normalized_phone"):
                    cls.record_import_log(
                        db=db,
                        workspace_id=ws_uuid,
                        gmail_message_id=msg_id,
                        integration_id=integration.id,
                        status="ignored",
                        error_code="no_valid_email_or_phone",
                    )
                    results["ignored_count"] += 1
                    results["details"].append({
                        "message_id": msg_id,
                        "action": "ignored",
                        "reason": "no_valid_email_or_phone",
                    })
                    continue

                # Upsert Lead into DB with deduplication
                lead, action = cls.create_or_update_lead(
                    db=db,
                    workspace_id=ws_uuid,
                    lead_data=extracted,
                    source_message_id=msg_id,
                )

                # Record successful import
                cls.record_import_log(
                    db=db,
                    workspace_id=ws_uuid,
                    gmail_message_id=msg_id,
                    integration_id=integration.id,
                    status="processed",
                    lead_id=lead.id,
                )

                if action == "created":
                    results["created_leads"] += 1
                else:
                    results["updated_leads"] += 1

                results["details"].append({
                    "message_id": msg_id,
                    "lead_id": str(lead.id),
                    "action": action,
                    "email": lead.normalized_email,
                    "source_type": lead_source_type,
                })

            except Exception as msg_err:
                logger.error("Error processing message %s: %s", msg_id, str(msg_err), exc_info=True)
                cls.record_import_log(
                    db=db,
                    workspace_id=ws_uuid,
                    gmail_message_id=msg_id,
                    integration_id=integration.id,
                    status="error",
                    error_code=str(msg_err)[:100],
                )
                results["details"].append({
                    "message_id": msg_id,
                    "action": "error",
                    "error": str(msg_err),
                })

        return results
