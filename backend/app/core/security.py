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
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user credentials or user ID."
        )

    # Check if target_workspace_id was explicitly provided
    if target_workspace_id is not None:
        s_target = str(target_workspace_id).strip()
        if s_target.lower() not in ("null", "undefined", "none", ""):
            ws_id = to_uuid(s_target)
            if not ws_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid workspace ID format: '{s_target}'"
                )
            membership = db.query(WorkspaceMember).filter(
                WorkspaceMember.user_id == user_id,
                WorkspaceMember.workspace_id == ws_id
            ).first()
            if not membership:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied or workspace not found."
                )
            return str(membership.workspace_id)

    # Fallback to default user workspace
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.user_id == user_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied or workspace not found."
        )
    
    return str(membership.workspace_id)