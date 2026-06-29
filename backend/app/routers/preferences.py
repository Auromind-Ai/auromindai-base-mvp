
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from zoneinfo import available_timezones
from app.schemas.preferences import PreferencesUpdate

from app.database import get_db
from app.routers.auth import get_current_user, CurrentUser
from app.models.user import User

router = APIRouter()

#  Cached set of valid IANA timezone names
_VALID_TIMEZONES = available_timezones()



#  Routes ─

@router.get("/me/preferences")
async def get_preferences(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the current user's preferences dict."""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.preferences or {}


@router.patch("/me/preferences")
async def update_preferences(
    payload: PreferencesUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate timezone value against IANA database
    update_data = payload.dict(exclude_unset=True)
    if "timezone" in update_data and update_data["timezone"] is not None:
        if update_data["timezone"] not in _VALID_TIMEZONES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid timezone: {update_data['timezone']}. "
                       "Must be a valid IANA timezone name.",
            )

    # Build a NEW dict — never mutate in place
    existing = user.preferences or {}
    merged = {**existing, **update_data}
    user.preferences = merged

    # Belt-and-suspenders: explicitly mark column dirty
    flag_modified(user, "preferences")

    db.flush()

    return merged
