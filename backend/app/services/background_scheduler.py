from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import sessionmaker
from app.services.email_automation.email_monitor_service import EmailMonitor
from datetime import datetime
from app.core.logger import logger


class EmailSchedulerService:

    def __init__(self, engine):
        self.scheduler = BackgroundScheduler()
        self.SessionLocal = sessionmaker(bind=engine)
        self.monitor = EmailMonitor()

    def start(self):
        print("Email Scheduler Started at:", datetime.now())
        self.scheduler.add_job(
            self._run_email_monitor,
            trigger="interval",
            minutes=100,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=60
        )
        self.scheduler.start()

    def stop(self):
        print("Email Scheduler Stopped at:", datetime.now())
        self.scheduler.shutdown(wait=False)

    def _run_email_monitor(self):
        print("\nScheduler Triggered at:", datetime.now())
        db = self.SessionLocal()
        try:
            self.monitor.run_cycle(db)
            logger.debug("Email monitor cycle completed successfully")
        except Exception as e:
            logger.error(
                "Email monitor job failed with unhandled exception: %s",
                str(e),
                exc_info=True
            )
            try:
                db.rollback()
                logger.debug("Database session rolled back after email monitor error")
            except Exception as rollback_error:
                logger.error(
                    "Failed to rollback database session after email monitor error: %s",
                    str(rollback_error),
                    exc_info=True
                )
        finally:
            try:
                db.close()
                logger.debug("Database session closed after email monitor job")
            except Exception as close_error:
                logger.error(
                    "Failed to close database session after email monitor job: %s",
                    str(close_error),
                    exc_info=True
                )