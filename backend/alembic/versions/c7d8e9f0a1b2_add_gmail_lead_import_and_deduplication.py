
"""add gmail lead import and deduplication

Revision ID: c7d8e9f0a1b2
Revises: z2a3b4c5d6e7
Create Date: 2026-08-25 14:44:47.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = 'c7d8e9f0a1b2'
down_revision = 'z2a3b4c5d6e7'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Update leads table columns
    if 'leads' in tables:
        columns = [c['name'] for c in inspector.get_columns('leads')]
        indexes = [ix['name'] for ix in inspector.get_indexes('leads')]
        constraints = [c['name'] for c in inspector.get_unique_constraints('leads')]

        with op.batch_alter_table('leads', schema=None) as batch_op:
            if 'email' not in columns:
                batch_op.add_column(sa.Column('email', sa.String(length=255), nullable=True))
            if 'normalized_email' not in columns:
                batch_op.add_column(sa.Column('normalized_email', sa.String(length=255), nullable=True))
            if 'normalized_phone' not in columns:
                batch_op.add_column(sa.Column('normalized_phone', sa.String(length=50), nullable=True))
            if 'company' not in columns:
                batch_op.add_column(sa.Column('company', sa.String(length=255), nullable=True))
            if 'source_message_id' not in columns:
                batch_op.add_column(sa.Column('source_message_id', sa.String(length=255), nullable=True))
            if 'updated_at' not in columns:
                batch_op.add_column(sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
            if 'conversation_id' in columns:
                batch_op.alter_column('conversation_id', existing_type=UUID(as_uuid=True), nullable=True)
            if 'ix_leads_email' not in indexes:
                batch_op.create_index('ix_leads_email', ['email'], unique=False)
            if 'ix_leads_normalized_email' not in indexes:
                batch_op.create_index('ix_leads_normalized_email', ['normalized_email'], unique=False)
            if 'ix_leads_normalized_phone' not in indexes:
                batch_op.create_index('ix_leads_normalized_phone', ['normalized_phone'], unique=False)
            if 'ix_leads_source_message_id' not in indexes:
                batch_op.create_index('ix_leads_source_message_id', ['source_message_id'], unique=False)
            if 'uq_leads_workspace_normalized_email' not in constraints:
                batch_op.create_unique_constraint('uq_leads_workspace_normalized_email', ['workspace_id', 'normalized_email'])

    # 2. Create gmail_import_logs table
    if 'gmail_import_logs' not in tables:
        op.create_table(
            'gmail_import_logs',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('workspace_id', UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
            sa.Column('gmail_message_id', sa.String(length=255), nullable=False),
            sa.Column('integration_id', UUID(as_uuid=True), sa.ForeignKey('integrations.id', ondelete='SET NULL'), nullable=True),
            sa.Column('processed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='processed'),
            sa.Column('error_code', sa.String(length=100), nullable=True),
            sa.Column('lead_id', UUID(as_uuid=True), sa.ForeignKey('leads.id', ondelete='SET NULL'), nullable=True),
            sa.UniqueConstraint('workspace_id', 'gmail_message_id', name='uq_gmail_import_workspace_msg')
        )

    inspector = sa.inspect(bind)
    if 'gmail_import_logs' in inspector.get_table_names():
        indexes = [ix['name'] for ix in inspector.get_indexes('gmail_import_logs')]
        if 'ix_gmail_import_logs_workspace_id' not in indexes:
            try:
                op.create_index('ix_gmail_import_logs_workspace_id', 'gmail_import_logs', ['workspace_id'], unique=False)
            except Exception:
                pass
        if 'ix_gmail_import_logs_gmail_message_id' not in indexes:
            try:
                op.create_index('ix_gmail_import_logs_gmail_message_id', 'gmail_import_logs', ['gmail_message_id'], unique=False)
            except Exception:
                pass
        if 'ix_gmail_import_logs_integration_id' not in indexes:
            try:
                op.create_index('ix_gmail_import_logs_integration_id', 'gmail_import_logs', ['integration_id'], unique=False)
            except Exception:
                pass
        if 'ix_gmail_import_logs_lead_id' not in indexes:
            try:
                op.create_index('ix_gmail_import_logs_lead_id', 'gmail_import_logs', ['lead_id'], unique=False)
            except Exception:
                pass


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'gmail_import_logs' in tables:
        op.drop_table('gmail_import_logs')

    if 'leads' in tables:
        columns = [c['name'] for c in inspector.get_columns('leads')]
        indexes = [ix['name'] for ix in inspector.get_indexes('leads')]
        constraints = [c['name'] for c in inspector.get_unique_constraints('leads')]

        with op.batch_alter_table('leads', schema=None) as batch_op:
            if 'uq_leads_workspace_normalized_email' in constraints:
                batch_op.drop_constraint('uq_leads_workspace_normalized_email', type_='unique')
            if 'ix_leads_source_message_id' in indexes:
                batch_op.drop_index('ix_leads_source_message_id')
            if 'ix_leads_normalized_phone' in indexes:
                batch_op.drop_index('ix_leads_normalized_phone')
            if 'ix_leads_normalized_email' in indexes:
                batch_op.drop_index('ix_leads_normalized_email')
            if 'ix_leads_email' in indexes:
                batch_op.drop_index('ix_leads_email')
            if 'conversation_id' in columns:
                batch_op.alter_column('conversation_id', existing_type=UUID(as_uuid=True), nullable=False)
            if 'updated_at' in columns:
                batch_op.drop_column('updated_at')
            if 'source_message_id' in columns:
                batch_op.drop_column('source_message_id')
            if 'company' in columns:
                batch_op.drop_column('company')
            if 'normalized_phone' in columns:
                batch_op.drop_column('normalized_phone')
            if 'normalized_email' in columns:
                batch_op.drop_column('normalized_email')
            if 'email' in columns:
                batch_op.drop_column('email')
