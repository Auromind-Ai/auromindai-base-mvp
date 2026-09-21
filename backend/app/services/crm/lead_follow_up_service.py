"""Workspace-scoped persistence for the CRM follow-up list."""
from app.models.ai_action import Lead


def add_follow_ups(db, workspace_id, selected_ids):
    selected_ids = set(selected_ids)
    query = db.query(Lead).filter(Lead.workspace_id == workspace_id, Lead.id.in_(selected_ids))
    if query.count() != len(selected_ids):
        raise LookupError("One or more selected leads were not found in this workspace.")
    query.update({Lead.is_follow_up: True}, synchronize_session=False)
    db.commit()
    return {"total": len(selected_ids)}


def remove_follow_up(db, workspace_id, lead_id):
    lead = db.query(Lead).filter(Lead.workspace_id == workspace_id, Lead.id == lead_id).first()
    if lead is None:
        raise LookupError("Lead not found in this workspace.")
    lead.is_follow_up = False
    db.commit()
    return {"removed": str(lead.id)}
