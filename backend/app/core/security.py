import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.workspace import WorkspaceMember

def to_uuid(val):
    if val is None:
        return None
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError, AttributeError):
        return val

def verify_workspace_access(
    current_user, 
    db: Session, 
    target_workspace_id: uuid.UUID | str = None
) -> str:
    user_id = to_uuid(current_user.id)
    if target_workspace_id:
        ws_id = to_uuid(target_workspace_id)
        membership = db.query(WorkspaceMember).filter(
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.workspace_id == ws_id
        ).first()
        check_id = str(target_workspace_id)
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
    
    return check_id