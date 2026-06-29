from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session, sessionmaker
from app.core.logger import logger
from app.models.token_ledger import TokenLedger


def cleanup_stale_reservations(db: Session) -> int:
    now = datetime.now(timezone.utc)
    # Update matching reservations in a single statement to avoid partial state
    released_count = (
        db.query(TokenLedger)
        .filter(
            TokenLedger.status == "reserved",
            TokenLedger.expires_at.isnot(None),     
            TokenLedger.expires_at < now,
        )
        .update(
            {"status": "released", "description": "auto_cleanup_expired"},
            synchronize_session=False,
        )
    )

    if released_count:
        db.flush()

    return int(released_count or 0)


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
