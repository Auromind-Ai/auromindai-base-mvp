from sqlalchemy import func, select

from app.models.automation import AutomationFlow
from app.models.conversation import Conversation
from app.models.flow_execution import FlowExecutionState, FlowExecutionTrace


def lead_flow_associations():
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
    return (
        select(Conversation.id.label("conversation_id"), Conversation.workspace_id,
               AutomationFlow.id.label("flow_id"), AutomationFlow.name.label("flow_name"))
        .select_from(Conversation)
        .outerjoin(FlowExecutionState, FlowExecutionState.conversation_id == Conversation.id)
        .join(
            AutomationFlow,
            AutomationFlow.id == func.coalesce(FlowExecutionState.active_flow_id, latest_flow_id),
        )
        .filter(
            AutomationFlow.workspace_id == Conversation.workspace_id,
        )
    )


def get_lead_flow_names(db, workspace_id, conversation_ids):
    conversation_ids = list({value for value in conversation_ids if value is not None})
    if not conversation_ids:
        return {}
    rows = db.execute(lead_flow_associations().where(
        Conversation.workspace_id == workspace_id,
        Conversation.id.in_(conversation_ids),
    )).all()
    return {row.conversation_id: row.flow_name for row in rows}
