import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.workspace import WorkspaceMember

def verify_workspace_access(
    current_user, 
    db: Session, 
    target_workspace_id: uuid.UUID | str = None
) -> str:
    
    #Decide which ID to check
    check_id = str(target_workspace_id) if target_workspace_id else str(current_user.workspace_id)

    #Query the database to ensure the user is a member of this workspace
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.user_id == current_user.id,
        WorkspaceMember.workspace_id == check_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied or workspace not found."
        )
    
    return check_id