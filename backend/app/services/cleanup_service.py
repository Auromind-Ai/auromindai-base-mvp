from datetime import datetime, timezone
from sqlalchemy.orm import Session
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
