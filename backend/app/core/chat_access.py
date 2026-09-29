from fastapi import HTTPException

from app.core.security import to_uuid, verify_workspace_access
from app.services.inbox.session_service import SessionService


def resolve_chat_access(current_user, db, workspace_id=None, session_id=None):
    session = None
    if workspace_id is not None and not to_uuid(workspace_id):
        raise HTTPException(status_code=400, detail="Invalid workspace ID.")
    if session_id is not None:
        if not to_uuid(session_id):
            raise HTTPException(status_code=400, detail="Invalid chat session ID.")
        session = SessionService.get_session_by_id_and_user(db, session_id, str(current_user.id))
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if workspace_id is not None and to_uuid(workspace_id) != to_uuid(session.workspace_id):
            raise HTTPException(status_code=403, detail="Session does not belong to the specified workspace.")
        workspace_id = session.workspace_id
    if not to_uuid(workspace_id):
        raise HTTPException(status_code=400, detail="Select a workspace before using AI chat.")
    verified = verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")
    return verified, session
