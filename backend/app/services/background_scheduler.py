from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import sessionmaker
from app.services.email_monitor_service import EmailMonitor
from datetime import datetime

class EmailSchedulerService:

    def __init__(self, engine):
        self.scheduler = BackgroundScheduler()
        self.SessionLocal = sessionmaker(bind=engine)
        self.monitor = EmailMonitor()

    def start(self):
        print("🚀 Email Scheduler Started at:", datetime.now())
        self.scheduler.add_job(
            self._run_email_monitor,
            trigger="interval",
            minutes=1,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=60
        )
        self.scheduler.start()

    def stop(self):
        print("🛑 Email Scheduler Stopped at:", datetime.now())
        self.scheduler.shutdown(wait=False)

    def _run_email_monitor(self):
        print("\n⏰ Scheduler Triggered at:", datetime.now())
        db = self.SessionLocal()
        try:
            self.monitor.run_cycle(db)
        finally:
            db.close()