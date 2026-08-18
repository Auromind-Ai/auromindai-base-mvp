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
