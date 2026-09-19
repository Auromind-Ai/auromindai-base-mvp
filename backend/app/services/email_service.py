import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
import os

logger = logging.getLogger("auromind")

class EmailService:
    @staticmethod
    def render_template(template_str: str, variables: Dict[str, Any] = None) -> str:
        """Render templates by replacing double brace placeholders (e.g. {{user_name}})."""
        if not template_str:
            return ""
        
        # Inject standard platform branding variables automatically
        from app.database import SessionLocal
        from app.services.platform_settings_service import get_setting
        
        merged_vars = {
            "app_name": "Orbion Agents",
            "frontend_url": "http://localhost:3000"
        }
        
        db = SessionLocal()
        try:
            db_app_name = get_setting(db, "app_name")
            db_frontend_url = get_setting(db, "frontend_url")
            if db_app_name:
                merged_vars["app_name"] = db_app_name
            if db_frontend_url:
                merged_vars["frontend_url"] = db_frontend_url
        except Exception:
            pass
        finally:
            db.close()

        if variables:
            merged_vars.update(variables)

        rendered = template_str
        for k, v in merged_vars.items():
            val_str = str(v) if v is not None else ""
            rendered = rendered.replace(f"{{{{{k}}}}}", val_str)
            rendered = rendered.replace(f"{{{k}}}", val_str)
        return rendered

    @staticmethod
    def is_smtp_configured() -> bool:
        from app.services.config_service import config_service
        smtp_user = str(config_service.get("smtp_user", "")).strip()
        smtp_password = str(config_service.get("smtp_password", "")).strip()
        return bool(smtp_user and smtp_password)

    @staticmethod
    def send_email(
        to_email: str | list[str],
        subject: str,
        body: str,
        metadata: Dict[str, Any] = None,
        attachments: list[Dict[str, Any]] = None
    ):
        from app.services.config_service import config_service
        from email.mime.base import MIMEBase
        from email import encoders

        smtp_server = config_service.get("smtp_host", "smtp.gmail.com")
        smtp_port = int(config_service.get("smtp_port", 587))
        smtp_user = str(config_service.get("smtp_user", "")).strip()
        smtp_password = str(config_service.get("smtp_password", "")).strip()
        if smtp_password and "gmail.com" in str(smtp_server).lower():
            smtp_password = smtp_password.replace(" ", "")

        to_addrs = [to_email] if isinstance(to_email, str) else list(to_email)
        to_str = ", ".join(to_addrs)

        logger.info(f"SMTP Host Loaded: {smtp_server}")
        logger.info(f"SMTP User Loaded: {smtp_user}")
        logger.info(f"SMTP Password Configured: {bool(smtp_password)}")

        if not smtp_user or not smtp_password:
            logger.warning("SMTP credentials not configured. Simulating email send.")
            logger.info("--- SIMULATING EMAIL SEND ---")
            logger.info(f"To: {to_str}")
            safe_subj = str(subject).encode('ascii', 'replace').decode('ascii')
            safe_body = str(body[:200]).encode('ascii', 'replace').decode('ascii')
            logger.info(f"Subject: {safe_subj}")
            logger.info(f"Body: {safe_body}...")
            if attachments:
                logger.info(f"Attachments: {[a.get('filename') for a in attachments]}")
            if metadata:
                logger.info(f"Metadata: {metadata}")
            logger.info("-----------------------------")
            return {
                "status": "simulated",
                "simulated": True,
                "message": "SMTP is not configured. Email simulation logged.",
                "recipients": to_addrs,
                "attachments": [a.get("filename") for a in attachments] if attachments else []
            }

        try:
            msg = MIMEMultipart("mixed")
            msg['From'] = smtp_user
            msg['To'] = to_str
            msg['Subject'] = subject

            # Detect HTML content
            is_html = body.strip().startswith("<") or "<html>" in body.lower()
            alt_part = MIMEMultipart("alternative")
            if is_html:
                import re
                plain = re.sub(r'<[^>]+>', '', body)
                alt_part.attach(MIMEText(plain, 'plain'))
                alt_part.attach(MIMEText(body, 'html'))
            else:
                alt_part.attach(MIMEText(body, 'plain'))
            msg.attach(alt_part)

            # Process attachments
            if attachments:
                for att in attachments:
                    filename = att.get("filename", "attachment.csv")
                    content = att.get("content", b"")
                    mime_type = att.get("mime_type", "text/csv")
                    if isinstance(content, str):
                        content = content.encode("utf-8")
                    main_type, sub_type = mime_type.split("/", 1) if "/" in mime_type else ("application", "octet-stream")
                    part = MIMEBase(main_type, sub_type)
                    part.set_payload(content)
                    encoders.encode_base64(part)
                    part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
                    msg.attach(part)

            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_server, smtp_port)
            else:
                server = smtplib.SMTP(smtp_server, smtp_port)
                server.starttls()

            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_user, to_addrs, text)
            server.quit()

            logger.info(f"Email sent successfully to {to_str}")
            return {"status": "success", "message": "Email sent successfully.", "recipients": to_addrs}
        except Exception as e:
            logger.error(f"Failed to send email to {to_str}: {str(e)}")
            raise ValueError(f"Failed to send email: {str(e)}")

    @staticmethod
    def get_workspace_gmail_service(db, workspace_id):
        """
        Builds an authenticated Google Gmail API service for the workspace.
        Automatically handles token refresh.
        """
        import uuid as uuid_pkg
        from app.models.integration import Integration
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        from datetime import datetime, timezone as dt_timezone

        try:
            ws_uuid = uuid_pkg.UUID(str(workspace_id)) if isinstance(workspace_id, (str, uuid_pkg.UUID)) else workspace_id
        except Exception:
            return None, None

        integration = db.query(Integration).filter(
            Integration.workspace_id == ws_uuid,
            Integration.integration_type.in_(["google_gmail", "gmail"]),
            Integration.is_active == True
        ).first()

        if not integration or not integration.access_token:
            return None, None

        try:
            from app.services.config_service import config_service
            client_id = config_service.get("google_client_id")
            client_secret = config_service.get("google_client_secret")

            creds = Credentials(
                token=integration.access_token,
                refresh_token=integration.refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=client_id,
                client_secret=client_secret
            )

            if creds.expired and creds.refresh_token:
                logger.info(f"Auto-refreshing expired Gmail token for workspace {workspace_id}...")
                creds.refresh(Request())
                integration.access_token = creds.token
                if creds.expiry:
                    integration.token_expiry = creds.expiry
                integration.updated_at = datetime.now(dt_timezone.utc)
                db.commit()

            service = build("gmail", "v1", credentials=creds)
            return service, integration.connected_email
        except Exception as e:
            logger.warning(f"Unable to initialize Gmail API service for workspace {workspace_id}: {e}")
            return None, None

    @staticmethod
    def send_email_for_workspace(
        db,
        workspace_id,
        to_email: str | list[str],
        subject: str,
        body: str,
        plain_text: str = None,
        metadata: Dict[str, Any] = None,
        attachments: list[Dict[str, Any]] = None
    ):
        """
        Sends an email prioritizing the workspace's connected Gmail OAuth account.
        Falls back to platform SMTP / simulated delivery if Gmail is not connected.
        """
        to_addrs = [to_email] if isinstance(to_email, str) else list(to_email)
        valid_recipients = [e for e in to_addrs if e and "@" in str(e)]
        if not valid_recipients:
            logger.warning(f"Cannot send email: invalid recipients '{to_email}'")
            return {"status": "skipped", "reason": "Invalid recipient email"}

        to_str = ", ".join(valid_recipients)

        if db and workspace_id:
            try:
                gmail_service, sender_email = EmailService.get_workspace_gmail_service(db, workspace_id)
                if gmail_service:
                    import base64
                    import re
                    from email.mime.base import MIMEBase
                    from email import encoders

                    msg = MIMEMultipart("mixed")
                    msg["Subject"] = subject
                    msg["From"] = sender_email or "me"
                    msg["To"] = to_str

                    is_html = body.strip().startswith("<") or "<html>" in body.lower() or "</div>" in body.lower()
                    alt_part = MIMEMultipart("alternative")
                    if is_html:
                        text_part = MIMEText(plain_text or re.sub(r'<[^>]+>', '', body), "plain")
                        html_part = MIMEText(body, "html")
                        alt_part.attach(text_part)
                        alt_part.attach(html_part)
                    else:
                        alt_part.attach(MIMEText(body, "plain"))
                    msg.attach(alt_part)

                    if attachments:
                        for att in attachments:
                            filename = att.get("filename", "attachment.csv")
                            content = att.get("content", b"")
                            mime_type = att.get("mime_type", "text/csv")
                            if isinstance(content, str):
                                content = content.encode("utf-8")
                            main_type, sub_type = mime_type.split("/", 1) if "/" in mime_type else ("application", "octet-stream")
                            part = MIMEBase(main_type, sub_type)
                            part.set_payload(content)
                            encoders.encode_base64(part)
                            part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
                            msg.attach(part)

                    raw_bytes = base64.urlsafe_b64encode(msg.as_bytes()).decode()
                    sent_msg = gmail_service.users().messages().send(
                        userId="me",
                        body={"raw": raw_bytes}
                    ).execute()

                    logger.info(f"Email sent via workspace connected Gmail to {to_str} (Msg ID: {sent_msg.get('id')})")
                    return {
                        "status": "success",
                        "provider": "gmail",
                        "sender": sender_email or "me",
                        "recipients": valid_recipients,
                        "message_id": sent_msg.get("id")
                    }
            except Exception as ge:
                logger.warning(f"Gmail API send failed ({ge}). Falling back to SMTP...")

        # Fallback to SMTP / Simulation
        return EmailService.send_email(
            to_email=valid_recipients,
            subject=subject,
            body=body,
            metadata=metadata,
            attachments=attachments
        )
