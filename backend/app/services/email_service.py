import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
import os

logger = logging.getLogger("auromind")

class EmailService:
    @staticmethod
    def send_email(to_email: str, subject: str, body: str, metadata: Dict[str, Any] = None):
        from app.database import SessionLocal
        from app.services.platform_settings_service import get_setting
        from app.core.config import settings
       
        with SessionLocal() as db:
            smtp_server = get_setting(db, "smtp_host", settings.SMTP_HOST or "smtp.gmail.com")
            smtp_port = int(get_setting(db, "smtp_port", settings.SMTP_PORT or 587))
            smtp_user = get_setting(db, "smtp_user", settings.SMTP_USER or "")
            smtp_password = get_setting(db, "smtp_password", settings.SMTP_PASS or "")
       
        logger.info(f"SMTP Host Loaded: {smtp_server}")
        logger.info(f"SMTP User Loaded: {smtp_user}")
        logger.info(f"SMTP Password Configured: {bool(smtp_password)}")
       
        if not smtp_user or not smtp_password:
            logger.warning("SMTP credentials not configured. Simulating email send.")
            logger.info(f"--- SIMULATING EMAIL SEND ---")
            logger.info(f"To: {to_email}")
            logger.info(f"Subject: {subject}")
            logger.info(f"Body: {body[:200]}...")
            if metadata:
                logger.info(f"Metadata: {metadata}")
            logger.info(f"-----------------------------")
            return {"status": "success", "message": "Email simulation logged successfully."}

        try:
            msg = MIMEMultipart()
            msg['From'] = smtp_user
            msg['To'] = to_email
            msg['Subject'] = subject
           
            msg.attach(MIMEText(body, 'plain'))
           
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
