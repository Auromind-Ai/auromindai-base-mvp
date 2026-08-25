import uuid
from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.models.workspace import WorkspaceMember

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/verify-otp", auto_error=False)

def to_uuid(val):
    if val is None:
        return None
    if isinstance(val, uuid.UUID):
        return val
    s_val = str(val).strip()
    if s_val.lower() in ("null", "undefined", "none", ""):
        return None
    try:
        return uuid.UUID(s_val)
    except (ValueError, TypeError, AttributeError):
        return None

def verify_workspace_access(
    current_user, 
    db: Session, 
    target_workspace_id: uuid.UUID | str = None
) -> str:
    user_id = to_uuid(current_user.id)
    ws_id = to_uuid(target_workspace_id) if target_workspace_id else None

    if ws_id:
        membership = db.query(WorkspaceMember).filter(
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.workspace_id == ws_id
        ).first()
        check_id = str(ws_id)
    else:
        membership = db.query(WorkspaceMember).filter(
            WorkspaceMember.user_id == user_id
        ).first()
        if membership:
            check_id = str(membership.workspace_id)
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied or workspace not found."
        )
    
    return to_uuid(check_id) or check_id