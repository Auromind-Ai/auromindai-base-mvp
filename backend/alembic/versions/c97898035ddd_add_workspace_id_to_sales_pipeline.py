"""Add workspace_id to sales_pipeline

Revision ID: c97898035ddd
Revises: ee9d22e89db3
Create Date: 2026-06-08 05:11:51.971518

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c97898035ddd'
down_revision: Union[str, Sequence[str], None] = 'ee9d22e89db3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    def column_exists(table, column):
        columns = [col['name'] for col in inspector.get_columns(table)]
        return column in columns

    def index_exists(table, index_name):
        indexes = [idx['name'] for idx in inspector.get_indexes(table)]
        return index_name in indexes or any(idx['name'] == index_name for idx in inspector.get_indexes(table))

    def fk_exists_on_columns(table, columns):
        fks = inspector.get_foreign_keys(table)
        for fk in fks:
            if set(fk['constrained_columns']) == set(columns):
                return True
        return False

    def uq_exists_on_columns(table, columns):
        uqs = inspector.get_unique_constraints(table)
        for uq in uqs:
            if set(uq['column_names']) == set(columns):
                return True
        return False

    def constraint_exists(table, name):
        fks = [fk['name'] for fk in inspector.get_foreign_keys(table) if fk['name']]
        uqs = [uq['name'] for uq in inspector.get_unique_constraints(table) if uq['name']]
        return (name in fks) or (name in uqs)

    # ix_conversation_states
    if column_exists('conversation_states', 'workspace_id'):
        op.alter_column('conversation_states', 'workspace_id', existing_type=sa.UUID(), nullable=False)
    if column_exists('conversation_states', 'conversation_id'):
        op.alter_column('conversation_states', 'conversation_id', existing_type=sa.UUID(), nullable=False)
    if not index_exists('conversation_states', 'ix_conversation_states_conversation_id'):
        op.create_index(op.f('ix_conversation_states_conversation_id'), 'conversation_states', ['conversation_id'], unique=False)
    if not index_exists('conversation_states', 'ix_conversation_states_workspace_id'):
        op.create_index(op.f('ix_conversation_states_workspace_id'), 'conversation_states', ['workspace_id'], unique=False)

    # conversations
    if column_exists('conversations', 'workspace_id'):
        op.alter_column('conversations', 'workspace_id', existing_type=sa.UUID(), nullable=False)

    # followups
    if not column_exists('followups', 'workspace_id'):
        op.add_column('followups', sa.Column('workspace_id', sa.UUID(), nullable=False))
    if not index_exists('followups', 'ix_followups_workspace_id'):
        op.create_index(op.f('ix_followups_workspace_id'), 'followups', ['workspace_id'], unique=False)
    if not fk_exists_on_columns('followups', ['workspace_id']):
        op.create_foreign_key(None, 'followups', 'workspaces', ['workspace_id'], ['id'], ondelete='CASCADE')

    # human_escalations
    if column_exists('human_escalations', 'workspace_id'):
        op.alter_column('human_escalations', 'workspace_id', existing_type=sa.UUID(), nullable=False)
    if column_exists('human_escalations', 'conversation_id'):
        op.alter_column('human_escalations', 'conversation_id', existing_type=sa.UUID(), nullable=False)
    if not index_exists('human_escalations', 'ix_human_escalations_conversation_id'):
        op.create_index(op.f('ix_human_escalations_conversation_id'), 'human_escalations', ['conversation_id'], unique=False)
    if not index_exists('human_escalations', 'ix_human_escalations_workspace_id'):
        op.create_index(op.f('ix_human_escalations_workspace_id'), 'human_escalations', ['workspace_id'], unique=False)
    if not fk_exists_on_columns('human_escalations', ['conversation_id']):
        op.create_foreign_key(None, 'human_escalations', 'conversations', ['conversation_id'], ['id'], ondelete='CASCADE')
    if not fk_exists_on_columns('human_escalations', ['workspace_id']):
        op.create_foreign_key(None, 'human_escalations', 'workspaces', ['workspace_id'], ['id'], ondelete='CASCADE')
    if not fk_exists_on_columns('human_escalations', ['user_id']):
        op.create_foreign_key(None, 'human_escalations', 'users', ['user_id'], ['id'])

    # lead_score_history
    if column_exists('lead_score_history', 'lead_id'):
        op.alter_column('lead_score_history', 'lead_id', existing_type=sa.UUID(), nullable=False)
    if column_exists('lead_score_history', 'score_before'):
        op.alter_column('lead_score_history', 'score_before', existing_type=sa.INTEGER(), nullable=False)
    if column_exists('lead_score_history', 'score_after'):
        op.alter_column('lead_score_history', 'score_after', existing_type=sa.INTEGER(), nullable=False)
    if column_exists('lead_score_history', 'behavioral_score_delta'):
        op.alter_column('lead_score_history', 'behavioral_score_delta', existing_type=sa.INTEGER(), nullable=False)
    if column_exists('lead_score_history', 'intent_score_delta'):
        op.alter_column('lead_score_history', 'intent_score_delta', existing_type=sa.INTEGER(), nullable=False)
    if column_exists('lead_score_history', 'reason'):
        op.alter_column('lead_score_history', 'reason', existing_type=sa.VARCHAR(length=255), nullable=False)
    if column_exists('lead_score_history', 'created_at'):
        op.alter_column('lead_score_history', 'created_at', existing_type=postgresql.TIMESTAMP(timezone=True), nullable=False, existing_server_default=sa.text('CURRENT_TIMESTAMP'))
    if not index_exists('lead_score_history', 'ix_lead_score_history_created_at'):
        op.create_index(op.f('ix_lead_score_history_created_at'), 'lead_score_history', ['created_at'], unique=False)
    if not index_exists('lead_score_history', 'ix_lead_score_history_lead_id'):
        op.create_index(op.f('ix_lead_score_history_lead_id'), 'lead_score_history', ['lead_id'], unique=False)

    # leads
    if column_exists('leads', 'workspace_id'):
        op.alter_column('leads', 'workspace_id', existing_type=sa.UUID(), nullable=False)
    if column_exists('leads', 'conversation_id'):
        op.alter_column('leads', 'conversation_id', existing_type=sa.UUID(), nullable=False)
    if column_exists('leads', 'is_favorite'):
        op.alter_column('leads', 'is_favorite', existing_type=sa.BOOLEAN(), nullable=False, existing_server_default=sa.text('false'))
    if column_exists('leads', 'is_converted'):
        op.alter_column('leads', 'is_converted', existing_type=sa.BOOLEAN(), nullable=False, existing_server_default=sa.text('false'))
    if not index_exists('leads', 'ix_leads_conversation_id'):
        op.create_index(op.f('ix_leads_conversation_id'), 'leads', ['conversation_id'], unique=False)
    if not index_exists('leads', 'ix_leads_last_activity_at'):
        op.create_index(op.f('ix_leads_last_activity_at'), 'leads', ['last_activity_at'], unique=False)
    if not index_exists('leads', 'ix_leads_phone'):
        op.create_index(op.f('ix_leads_phone'), 'leads', ['phone'], unique=False)
    if not index_exists('leads', 'ix_leads_score'):
        op.create_index(op.f('ix_leads_score'), 'leads', ['score'], unique=False)
    if not index_exists('leads', 'ix_leads_status'):
        op.create_index(op.f('ix_leads_status'), 'leads', ['status'], unique=False)
    if not index_exists('leads', 'ix_leads_workspace_id'):
        op.create_index(op.f('ix_leads_workspace_id'), 'leads', ['workspace_id'], unique=False)
    if not fk_exists_on_columns('leads', ['assigned_to']):
        op.create_foreign_key(None, 'leads', 'users', ['assigned_to'], ['id'], ondelete='SET NULL')

    # learning_data
    if not column_exists('learning_data', 'workspace_id'):
        op.add_column('learning_data', sa.Column('workspace_id', sa.UUID(), nullable=False))
    if not column_exists('learning_data', 'profile_version'):
        op.add_column('learning_data', sa.Column('profile_version', sa.String(), nullable=False))
    if not index_exists('learning_data', 'ix_learning_data_workspace_id'):
        op.create_index(op.f('ix_learning_data_workspace_id'), 'learning_data', ['workspace_id'], unique=False)
    if not fk_exists_on_columns('learning_data', ['workspace_id']):
        op.create_foreign_key(None, 'learning_data', 'workspaces', ['workspace_id'], ['id'], ondelete='CASCADE')

    # rag_feedback
    if column_exists('rag_feedback', 'workspace_id'):
        op.alter_column('rag_feedback', 'workspace_id', existing_type=sa.UUID(), nullable=False)
    if not index_exists('rag_feedback', 'ix_rag_feedback_workspace_id'):
        op.create_index(op.f('ix_rag_feedback_workspace_id'), 'rag_feedback', ['workspace_id'], unique=False)
    if not fk_exists_on_columns('rag_feedback', ['workspace_id']):
        op.create_foreign_key(None, 'rag_feedback', 'workspaces', ['workspace_id'], ['id'], ondelete='CASCADE')

    # sales_pipeline
    if not column_exists('sales_pipeline', 'workspace_id'):
        op.add_column('sales_pipeline', sa.Column('workspace_id', sa.UUID(), nullable=False))
    if not column_exists('sales_pipeline', 'conversation_id'):
        op.add_column('sales_pipeline', sa.Column('conversation_id', sa.UUID(), nullable=False))
    if not column_exists('sales_pipeline', 'intent'):
        op.add_column('sales_pipeline', sa.Column('intent', sa.String(length=255), nullable=True))
    if not column_exists('sales_pipeline', 'lead_score'):
        op.add_column('sales_pipeline', sa.Column('lead_score', sa.String(length=50), nullable=True))
    if not column_exists('sales_pipeline', 'confidence_score'):
        op.add_column('sales_pipeline', sa.Column('confidence_score', sa.Float(), nullable=True))
    if not column_exists('sales_pipeline', 'objection_detected'):
        op.add_column('sales_pipeline', sa.Column('objection_detected', sa.Boolean(), nullable=True))
    if not column_exists('sales_pipeline', 'payment_required'):
        op.add_column('sales_pipeline', sa.Column('payment_required', sa.Boolean(), nullable=True))
    if not column_exists('sales_pipeline', 'meeting_required'):
        op.add_column('sales_pipeline', sa.Column('meeting_required', sa.Boolean(), nullable=True))
    if not index_exists('sales_pipeline', 'ix_sales_pipeline_conversation_id'):
        op.create_index(op.f('ix_sales_pipeline_conversation_id'), 'sales_pipeline', ['conversation_id'], unique=False)
    if not index_exists('sales_pipeline', 'ix_sales_pipeline_workspace_id'):
        op.create_index(op.f('ix_sales_pipeline_workspace_id'), 'sales_pipeline', ['workspace_id'], unique=False)
    if not uq_exists_on_columns('sales_pipeline', ['workspace_id', 'conversation_id']):
        op.create_unique_constraint('uq_sales_pipeline_scope', 'sales_pipeline', ['workspace_id', 'conversation_id'])
    if constraint_exists('sales_pipeline', 'sales_pipeline_user_id_fkey'):
        op.drop_constraint('sales_pipeline_user_id_fkey', 'sales_pipeline', type_='foreignkey')
    if not fk_exists_on_columns('sales_pipeline', ['conversation_id']):
        op.create_foreign_key(None, 'sales_pipeline', 'conversations', ['conversation_id'], ['id'], ondelete='CASCADE')
    if not fk_exists_on_columns('sales_pipeline', ['workspace_id']):
        op.create_foreign_key(None, 'sales_pipeline', 'workspaces', ['workspace_id'], ['id'], ondelete='CASCADE')
    if column_exists('sales_pipeline', 'expected_close_date'):
        op.drop_column('sales_pipeline', 'expected_close_date')
    if column_exists('sales_pipeline', 'deal_value'):
        op.drop_column('sales_pipeline', 'deal_value')
    if column_exists('sales_pipeline', 'user_id'):
        op.drop_column('sales_pipeline', 'user_id')
    if column_exists('sales_pipeline', 'objections'):
        op.drop_column('sales_pipeline', 'objections')
    if column_exists('sales_pipeline', 'interest_level'):
        op.drop_column('sales_pipeline', 'interest_level')
    if column_exists('sales_pipeline', 'payment_completed'):
        op.drop_column('sales_pipeline', 'payment_completed')

    # support_tickets
    if not column_exists('support_tickets', 'workspace_id'):
        op.add_column('support_tickets', sa.Column('workspace_id', sa.UUID(), nullable=False))
    if not column_exists('support_tickets', 'conversation_id'):
        op.add_column('support_tickets', sa.Column('conversation_id', sa.UUID(), nullable=False))
    if not index_exists('support_tickets', 'ix_support_tickets_conversation_id'):
        op.create_index(op.f('ix_support_tickets_conversation_id'), 'support_tickets', ['conversation_id'], unique=False)
    if not index_exists('support_tickets', 'ix_support_tickets_workspace_id'):
        op.create_index(op.f('ix_support_tickets_workspace_id'), 'support_tickets', ['workspace_id'], unique=False)
    if not fk_exists_on_columns('support_tickets', ['conversation_id']):
        op.create_foreign_key(None, 'support_tickets', 'conversations', ['conversation_id'], ['id'], ondelete='CASCADE')
    if not fk_exists_on_columns('support_tickets', ['workspace_id']):
        op.create_foreign_key(None, 'support_tickets', 'workspaces', ['workspace_id'], ['id'], ondelete='CASCADE')

    # template_logs
    if column_exists('template_logs', 'lead_id'):
        op.alter_column('template_logs', 'lead_id', existing_type=sa.UUID(), nullable=False)
    if column_exists('template_logs', 'sent_at'):
        op.alter_column('template_logs', 'sent_at', existing_type=postgresql.TIMESTAMP(timezone=True), nullable=False, existing_server_default=sa.text('CURRENT_TIMESTAMP'))
    if not index_exists('template_logs', 'ix_template_logs_lead_id'):
        op.create_index(op.f('ix_template_logs_lead_id'), 'template_logs', ['lead_id'], unique=False)
    if not index_exists('template_logs', 'ix_template_logs_template_id'):
        op.create_index(op.f('ix_template_logs_template_id'), 'template_logs', ['template_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    def column_exists(table, column):
        columns = [col['name'] for col in inspector.get_columns(table)]
        return column in columns

    def index_exists(table, index_name):
        indexes = [idx['name'] for idx in inspector.get_indexes(table)]
        return index_name in indexes

    def fk_exists_on_columns(table, columns):
        fks = inspector.get_foreign_keys(table)
        for fk in fks:
            if set(fk['constrained_columns']) == set(columns):
                return True
        return False

    def uq_exists_on_columns(table, columns):
        uqs = inspector.get_unique_constraints(table)
        for uq in uqs:
            if set(uq['column_names']) == set(columns):
                return True
        return False

    def constraint_exists(table, name):
        fks = [fk['name'] for fk in inspector.get_foreign_keys(table) if fk['name']]
        uqs = [uq['name'] for uq in inspector.get_unique_constraints(table) if uq['name']]
        return (name in fks) or (name in uqs)

    def drop_fk_by_columns(table, columns):
        fks = inspector.get_foreign_keys(table)
        for fk in fks:
            if set(fk['constrained_columns']) == set(columns):
                op.drop_constraint(fk['name'], table, type_='foreignkey')
                break

    if index_exists('template_logs', 'ix_template_logs_template_id'):
        op.drop_index(op.f('ix_template_logs_template_id'), table_name='template_logs')
    if index_exists('template_logs', 'ix_template_logs_lead_id'):
        op.drop_index(op.f('ix_template_logs_lead_id'), table_name='template_logs')
    if column_exists('template_logs', 'sent_at'):
        op.alter_column('template_logs', 'sent_at', existing_type=postgresql.TIMESTAMP(timezone=True), nullable=True, existing_server_default=sa.text('CURRENT_TIMESTAMP'))
    if column_exists('template_logs', 'lead_id'):
        op.alter_column('template_logs', 'lead_id', existing_type=sa.UUID(), nullable=True)

    drop_fk_by_columns('support_tickets', ['conversation_id'])
    drop_fk_by_columns('support_tickets', ['workspace_id'])
    if index_exists('support_tickets', 'ix_support_tickets_workspace_id'):
        op.drop_index(op.f('ix_support_tickets_workspace_id'), table_name='support_tickets')
    if index_exists('support_tickets', 'ix_support_tickets_conversation_id'):
        op.drop_index(op.f('ix_support_tickets_conversation_id'), table_name='support_tickets')
    if column_exists('support_tickets', 'conversation_id'):
        op.drop_column('support_tickets', 'conversation_id')
    if column_exists('support_tickets', 'workspace_id'):
        op.drop_column('support_tickets', 'workspace_id')

    if not column_exists('sales_pipeline', 'payment_completed'):
        op.add_column('sales_pipeline', sa.Column('payment_completed', sa.BOOLEAN(), autoincrement=False, nullable=True))
    if not column_exists('sales_pipeline', 'interest_level'):
        op.add_column('sales_pipeline', sa.Column('interest_level', sa.VARCHAR(length=50), autoincrement=False, nullable=True))
    if not column_exists('sales_pipeline', 'objections'):
        op.add_column('sales_pipeline', sa.Column('objections', postgresql.JSON(astext_type=sa.Text()), autoincrement=False, nullable=True))
    if not column_exists('sales_pipeline', 'user_id'):
        op.add_column('sales_pipeline', sa.Column('user_id', sa.UUID(), autoincrement=False, nullable=True))
    if not column_exists('sales_pipeline', 'deal_value'):
        op.add_column('sales_pipeline', sa.Column('deal_value', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True))
    if not column_exists('sales_pipeline', 'expected_close_date'):
        op.add_column('sales_pipeline', sa.Column('expected_close_date', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True))
    drop_fk_by_columns('sales_pipeline', ['conversation_id'])
    drop_fk_by_columns('sales_pipeline', ['workspace_id'])
    if not fk_exists_on_columns('sales_pipeline', ['user_id']):
        op.create_foreign_key(op.f('sales_pipeline_user_id_fkey'), 'sales_pipeline', 'users', ['user_id'], ['id'])
    if constraint_exists('sales_pipeline', 'uq_sales_pipeline_scope'):
        op.drop_constraint('uq_sales_pipeline_scope', 'sales_pipeline', type_='unique')
    if index_exists('sales_pipeline', 'ix_sales_pipeline_workspace_id'):
        op.drop_index(op.f('ix_sales_pipeline_workspace_id'), table_name='sales_pipeline')
    if index_exists('sales_pipeline', 'ix_sales_pipeline_conversation_id'):
        op.drop_index(op.f('ix_sales_pipeline_conversation_id'), table_name='sales_pipeline')
    if column_exists('sales_pipeline', 'meeting_required'):
        op.drop_column('sales_pipeline', 'meeting_required')
    if column_exists('sales_pipeline', 'payment_required'):
        op.drop_column('sales_pipeline', 'payment_required')
    if column_exists('sales_pipeline', 'objection_detected'):
        op.drop_column('sales_pipeline', 'objection_detected')
    if column_exists('sales_pipeline', 'confidence_score'):
        op.drop_column('sales_pipeline', 'confidence_score')
    if column_exists('sales_pipeline', 'lead_score'):
        op.drop_column('sales_pipeline', 'lead_score')
    if column_exists('sales_pipeline', 'intent'):
        op.drop_column('sales_pipeline', 'intent')
    if column_exists('sales_pipeline', 'conversation_id'):
        op.drop_column('sales_pipeline', 'conversation_id')
    if column_exists('sales_pipeline', 'workspace_id'):
        op.drop_column('sales_pipeline', 'workspace_id')

    drop_fk_by_columns('rag_feedback', ['workspace_id'])
    if index_exists('rag_feedback', 'ix_rag_feedback_workspace_id'):
        op.drop_index(op.f('ix_rag_feedback_workspace_id'), table_name='rag_feedback')
    if column_exists('rag_feedback', 'workspace_id'):
        op.alter_column('rag_feedback', 'workspace_id', existing_type=sa.UUID(), nullable=True)

    drop_fk_by_columns('learning_data', ['workspace_id'])
    if index_exists('learning_data', 'ix_learning_data_workspace_id'):
        op.drop_index(op.f('ix_learning_data_workspace_id'), table_name='learning_data')
    if column_exists('learning_data', 'profile_version'):
        op.drop_column('learning_data', 'profile_version')
    if column_exists('learning_data', 'workspace_id'):
        op.drop_column('learning_data', 'workspace_id')

    drop_fk_by_columns('leads', ['assigned_to'])
    if index_exists('leads', 'ix_leads_workspace_id'):
        op.drop_index(op.f('ix_leads_workspace_id'), table_name='leads')
    if index_exists('leads', 'ix_leads_status'):
        op.drop_index(op.f('ix_leads_status'), table_name='leads')
    if index_exists('leads', 'ix_leads_score'):
        op.drop_index(op.f('ix_leads_score'), table_name='leads')
    if index_exists('leads', 'ix_leads_phone'):
        op.drop_index(op.f('ix_leads_phone'), table_name='leads')
    if index_exists('leads', 'ix_leads_last_activity_at'):
        op.drop_index(op.f('ix_leads_last_activity_at'), table_name='leads')
    if index_exists('leads', 'ix_leads_conversation_id'):
        op.drop_index(op.f('ix_leads_conversation_id'), table_name='leads')
    if column_exists('leads', 'is_converted'):
        op.alter_column('leads', 'is_converted', existing_type=sa.BOOLEAN(), nullable=True, existing_server_default=sa.text('false'))
    if column_exists('leads', 'is_favorite'):
        op.alter_column('leads', 'is_favorite', existing_type=sa.BOOLEAN(), nullable=True, existing_server_default=sa.text('false'))
    if column_exists('leads', 'conversation_id'):
        op.alter_column('leads', 'conversation_id', existing_type=sa.UUID(), nullable=True)
    if column_exists('leads', 'workspace_id'):
        op.alter_column('leads', 'workspace_id', existing_type=sa.UUID(), nullable=True)

    if index_exists('lead_score_history', 'ix_lead_score_history_lead_id'):
        op.drop_index(op.f('ix_lead_score_history_lead_id'), table_name='lead_score_history')
    if index_exists('lead_score_history', 'ix_lead_score_history_created_at'):
        op.drop_index(op.f('ix_lead_score_history_created_at'), table_name='lead_score_history')
    if column_exists('lead_score_history', 'created_at'):
        op.alter_column('lead_score_history', 'created_at', existing_type=postgresql.TIMESTAMP(timezone=True), nullable=True, existing_server_default=sa.text('CURRENT_TIMESTAMP'))
    if column_exists('lead_score_history', 'reason'):
        op.alter_column('lead_score_history', 'reason', existing_type=sa.VARCHAR(length=255), nullable=True)
    if column_exists('lead_score_history', 'intent_score_delta'):
        op.alter_column('lead_score_history', 'intent_score_delta', existing_type=sa.INTEGER(), nullable=True)
    if column_exists('lead_score_history', 'behavioral_score_delta'):
        op.alter_column('lead_score_history', 'behavioral_score_delta', existing_type=sa.INTEGER(), nullable=True)
    if column_exists('lead_score_history', 'score_after'):
        op.alter_column('lead_score_history', 'score_after', existing_type=sa.INTEGER(), nullable=True)
    if column_exists('lead_score_history', 'score_before'):
        op.alter_column('lead_score_history', 'score_before', existing_type=sa.INTEGER(), nullable=True)
    if column_exists('lead_score_history', 'lead_id'):
        op.alter_column('lead_score_history', 'lead_id', existing_type=sa.UUID(), nullable=True)

    drop_fk_by_columns('human_escalations', ['conversation_id'])
    drop_fk_by_columns('human_escalations', ['workspace_id'])
    drop_fk_by_columns('human_escalations', ['user_id'])
    if index_exists('human_escalations', 'ix_human_escalations_workspace_id'):
        op.drop_index(op.f('ix_human_escalations_workspace_id'), table_name='human_escalations')
    if index_exists('human_escalations', 'ix_human_escalations_conversation_id'):
        op.drop_index(op.f('ix_human_escalations_conversation_id'), table_name='human_escalations')
    if column_exists('human_escalations', 'conversation_id'):
        op.alter_column('human_escalations', 'conversation_id', existing_type=sa.UUID(), nullable=True)
    if column_exists('human_escalations', 'workspace_id'):
        op.alter_column('human_escalations', 'workspace_id', existing_type=sa.UUID(), nullable=True)

    drop_fk_by_columns('followups', ['workspace_id'])
    if index_exists('followups', 'ix_followups_workspace_id'):
        op.drop_index(op.f('ix_followups_workspace_id'), table_name='followups')
    if column_exists('followups', 'workspace_id'):
        op.drop_column('followups', 'workspace_id')

    if column_exists('conversations', 'workspace_id'):
        op.alter_column('conversations', 'workspace_id', existing_type=sa.UUID(), nullable=True)

    if index_exists('conversation_states', 'ix_conversation_states_workspace_id'):
        op.drop_index(op.f('ix_conversation_states_workspace_id'), table_name='conversation_states')
    if index_exists('conversation_states', 'ix_conversation_states_conversation_id'):
        op.drop_index(op.f('ix_conversation_states_conversation_id'), table_name='conversation_states')
    if column_exists('conversation_states', 'conversation_id'):
        op.alter_column('conversation_states', 'conversation_id', existing_type=sa.UUID(), nullable=True)
    if column_exists('conversation_states', 'workspace_id'):
        op.alter_column('conversation_states', 'workspace_id', existing_type=sa.UUID(), nullable=True)

    # ### end Alembic commands ###
