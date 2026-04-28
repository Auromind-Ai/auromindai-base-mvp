import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.workspace import WorkspaceMember

def verify_workspace_access(
    current_user, 
    db: Session, 
    target_workspace_id: uuid.UUID | str = None
) -> str:
    """
    Standardized Workspace Verification.
    - If target_workspace_id is passed, it verifies that specific ID.
    - If NOT passed, it verifies the current_user's default workspace_id.
    Returns the verified workspace_id as a string.
    """
    # 1. Decide which ID to check
    check_id = str(target_workspace_id) if target_workspace_id else str(current_user.workspace_id)

    # 2. Query the database to ensure the user is a member of this workspace
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.user_id == current_user.id,
        WorkspaceMember.workspace_id == check_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied or workspace not found."
        )
    
    # 3. Return the stringified ID so routers can safely use it for DB queries
    return check_id