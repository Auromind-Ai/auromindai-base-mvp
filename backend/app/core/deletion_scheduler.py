"""Daily background job — permanent account deletion after grace period."""

from apscheduler.schedulers.background import BackgroundScheduler

_scheduler = None   # module-level, so it isn't garbage collected


def register_deletion_job() -> None:
    """
    Creates a standalone BackgroundScheduler and registers the daily deletion job.
    Call once from startup — no external scheduler instance needed.
    """
    global _scheduler

    from app.database import SessionLocal
    from app.services.account_service import AccountService

    def _run():
        db = SessionLocal()
        try:
            count = AccountService.run_permanent_deletion(db)
            if count:
                print(f"[DeletionJob] Processed {count} expired account(s).")
        except Exception as e:
            print(f"[DeletionJob] Unexpected error: {e}")
        finally:
            db.close()

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        _run,
        trigger="cron",
        hour=2,
        minute=0,
        id="account_permanent_deletion",
        replace_existing=True,
    )
    _scheduler.start()
    print("[DeletionJob] Daily deletion job registered — runs at 02:00 UTC.")