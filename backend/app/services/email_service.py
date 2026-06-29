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
        from app.services.config_service import config_service
        smtp_server = config_service.get("smtp_host", "smtp.gmail.com")
        smtp_port = int(config_service.get("smtp_port", 587))
        smtp_user = config_service.get("smtp_user", "")
        smtp_password = config_service.get("smtp_password", "")
       
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
