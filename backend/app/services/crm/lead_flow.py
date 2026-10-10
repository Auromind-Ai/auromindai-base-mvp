from sqlalchemy import func, select

from app.models.automation import AutomationFlow
from app.models.conversation import Conversation
from app.models.flow_execution import FlowExecutionState, FlowExecutionTrace


def get_lead_flow_names(db, workspace_id, conversation_ids):
    conversation_ids = list({value for value in conversation_ids if value is not None})
    if not conversation_ids:
        return {}

    # Completed flows clear active_flow_id; retain their last recorded flow.
    latest_flow_id = (
        select(FlowExecutionTrace.flow_id)
        .where(
            FlowExecutionTrace.conversation_id == Conversation.id,
            FlowExecutionTrace.flow_id.isnot(None),
        )
        .order_by(FlowExecutionTrace.created_at.desc(), FlowExecutionTrace.id.desc())
        .limit(1)
        .correlate(Conversation)
        .scalar_subquery()
    )
    rows = (
        db.query(Conversation.id, AutomationFlow.name)
        .outerjoin(FlowExecutionState, FlowExecutionState.conversation_id == Conversation.id)
        .join(
            AutomationFlow,
            AutomationFlow.id == func.coalesce(FlowExecutionState.active_flow_id, latest_flow_id),
        )
        .filter(
            Conversation.workspace_id == workspace_id,
            Conversation.id.in_(conversation_ids),
            AutomationFlow.workspace_id == workspace_id,
        )
        .all()
    )
    return {conversation_id: name for conversation_id, name in rows}
