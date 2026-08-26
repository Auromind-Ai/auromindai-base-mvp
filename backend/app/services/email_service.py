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
    def send_email(to_email: str, subject: str, body: str, metadata: Dict[str, Any] = None):
        from app.services.config_service import config_service
        smtp_server = config_service.get("smtp_host", "smtp.gmail.com")
        smtp_port = int(config_service.get("smtp_port", 587))
        smtp_user = str(config_service.get("smtp_user", "")).strip()
        smtp_password = str(config_service.get("smtp_password", "")).strip()
        if smtp_password and "gmail.com" in str(smtp_server).lower():
            smtp_password = smtp_password.replace(" ", "")

        logger.info(f"SMTP Host Loaded: {smtp_server}")
        logger.info(f"SMTP User Loaded: {smtp_user}")
        logger.info(f"SMTP Password Configured: {bool(smtp_password)}")

        if not smtp_user or not smtp_password:
            logger.warning("SMTP credentials not configured. Simulating email send.")
            logger.info("--- SIMULATING EMAIL SEND ---")
            logger.info(f"To: {to_email}")
            safe_subj = str(subject).encode('ascii', 'replace').decode('ascii')
            safe_body = str(body[:200]).encode('ascii', 'replace').decode('ascii')
            logger.info(f"Subject: {safe_subj}")
            logger.info(f"Body: {safe_body}...")
            if metadata:
                logger.info(f"Metadata: {metadata}")
            logger.info("-----------------------------")
            return {"status": "simulated", "simulated": True, "message": "SMTP is not configured. Email simulation logged."}

        try:
            msg = MIMEMultipart()
            msg['From'] = smtp_user
            msg['To'] = to_email
            msg['Subject'] = subject
           
            # Detect HTML content
            is_html = body.strip().startswith("<") or "<html>" in body.lower()
            mime_type = 'html' if is_html else 'plain'
            msg.attach(MIMEText(body, mime_type))
           
            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_server, smtp_port)
            else:
                server = smtplib.SMTP(smtp_server, smtp_port)
                server.starttls()
               
            server.login(smtp_user, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_user, to_email, text)
            server.quit()
           
            logger.info(f"Email sent successfully to {to_email}")
            return {"status": "success", "message": "Email sent successfully."}
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
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
        to_email: str,
        subject: str,
        body: str,
        plain_text: str = None,
        metadata: Dict[str, Any] = None
    ):
        """
        Sends an email prioritizing the workspace's connected Gmail OAuth account.
        Falls back to platform SMTP / simulated delivery if Gmail is not connected.
        """
        if not to_email or "@" not in str(to_email):
            logger.warning(f"Cannot send email: invalid recipient '{to_email}'")
            return {"status": "skipped", "reason": "Invalid recipient email"}

        if db and workspace_id:
            try:
                gmail_service, sender_email = EmailService.get_workspace_gmail_service(db, workspace_id)
                if gmail_service:
                    import base64
                    import re
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subject
                    msg["From"] = sender_email or "me"
                    msg["To"] = to_email

                    is_html = body.strip().startswith("<") or "<html>" in body.lower() or "</div>" in body.lower()
                    if is_html:
                        text_part = MIMEText(plain_text or re.sub(r'<[^>]+>', '', body), "plain")
                        html_part = MIMEText(body, "html")
                        msg.attach(text_part)
                        msg.attach(html_part)
                    else:
                        msg.attach(MIMEText(body, "plain"))

                    raw_bytes = base64.urlsafe_b64encode(msg.as_bytes()).decode()
                    sent_msg = gmail_service.users().messages().send(
                        userId="me",
                        body={"raw": raw_bytes}
                    ).execute()

                    logger.info(f"Email sent via workspace connected Gmail to {to_email} (Msg ID: {sent_msg.get('id')})")
                    return {
                        "status": "success",
                        "provider": "gmail",
                        "sender": sender_email or "me",
                        "message_id": sent_msg.get("id")
                    }
            except Exception as ge:
                logger.warning(f"Gmail API send failed ({ge}). Falling back to SMTP...")

        # Fallback to SMTP / Simulation
        return EmailService.send_email(to_email=to_email, subject=subject, body=body, metadata=metadata)
