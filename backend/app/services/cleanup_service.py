import os
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session, sessionmaker

from app.core.logger import logger
from app.models.credit_ledger import CreditLedger


RESERVATION_TTL_SECONDS = int(os.getenv("BILLING_RESERVATION_TTL_SECONDS", "1800"))


def cleanup_stale_reservations(db: Session) -> int:
    now = datetime.now(timezone.utc)
    stale_reservations = (
        db.query(CreditLedger)
        .filter(
            CreditLedger.status == "reserved",
            CreditLedger.expires_at.isnot(None),
            CreditLedger.expires_at < now,
        )
        .all()
    )

    released_count = 0
    for reservation in stale_reservations:
        reservation.status = "released"
        reservation.description = "auto_cleanup_expired"
        released_count += 1

    if released_count:
        db.flush()

    return released_count


class ReservationCleanupSchedulerService:
    def __init__(self, engine):
        self.scheduler = BackgroundScheduler()
        self.SessionLocal = sessionmaker(bind=engine)

    def start(self):
        self.scheduler.add_job(
            self._run_cleanup,
            trigger="interval",
            seconds=60,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=30,
        )
        self.scheduler.start()

    def stop(self):
        self.scheduler.shutdown(wait=False)

    def _run_cleanup(self):
        db = self.SessionLocal()
        try:
            released_count = cleanup_stale_reservations(db)
            db.commit()
            if released_count:
                logger.info("Released %s stale billing reservations", released_count)
        except Exception as exc:
            db.rollback()
            logger.error("Reservation cleanup failed: %s", exc)
        finally:
            db.close()
