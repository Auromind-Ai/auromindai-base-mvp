"""Email Retry Worker — Handles background email retries during temporary SMTP outages."""

import logging
import time
from app.services.email_service import EmailService

logger = logging.getLogger("auromind")

def send_email_with_retry(to_email: str, subject: str, body: str, metadata: dict = None, max_attempts: int = 3) -> bool:
    """
    Attempts to send an email immediately. If SMTP fails, executes retry attempts with exponential backoff.
    """
    for attempt in range(1, max_attempts + 1):
        try:
            logger.info(f"[EmailRetryWorker] Sending email to {to_email} (Attempt {attempt}/{max_attempts})")
            EmailService.send_email(to_email=to_email, subject=subject, body=body, metadata=metadata)
            logger.info(f"[EmailRetryWorker] Email delivered successfully to {to_email} on attempt {attempt}")
            return True
        except Exception as exc:
            logger.warning(f"[EmailRetryWorker] Attempt {attempt}/{max_attempts} failed for {to_email}: {exc}")
            if attempt < max_attempts:
                try:
                    from app.core.metrics import notification_metrics
                    notification_metrics.increment("email_retry_count_total")
                except Exception:
                    pass
                backoff_seconds = 2 ** attempt  # 2s, 4s backoff for testing/production
                time.sleep(backoff_seconds)
            else:
                logger.error(f"[PERMANENT_EMAIL_FAILURE] All {max_attempts} attempts failed for {to_email}. Error: {exc}")
                return False

    return False
