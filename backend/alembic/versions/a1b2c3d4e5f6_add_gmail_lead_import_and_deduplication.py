
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'z2a3b4c5d6e7'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Update leads table columns
    with op.batch_alter_table('leads', schema=None) as batch_op:
        batch_op.add_column(sa.Column('email', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('normalized_email', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('normalized_phone', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('company', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('source_message_id', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.alter_column('conversation_id', existing_type=UUID(as_uuid=True), nullable=True)
        batch_op.create_index('ix_leads_email', ['email'], unique=False)
        batch_op.create_index('ix_leads_normalized_email', ['normalized_email'], unique=False)
        batch_op.create_index('ix_leads_normalized_phone', ['normalized_phone'], unique=False)
        batch_op.create_index('ix_leads_source_message_id', ['source_message_id'], unique=False)
        batch_op.create_unique_constraint('uq_leads_workspace_normalized_email', ['workspace_id', 'normalized_email'])

    # 2. Create gmail_import_logs table
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
    op.create_index('ix_gmail_import_logs_workspace_id', 'gmail_import_logs', ['workspace_id'], unique=False)
    op.create_index('ix_gmail_import_logs_gmail_message_id', 'gmail_import_logs', ['gmail_message_id'], unique=False)
    op.create_index('ix_gmail_import_logs_integration_id', 'gmail_import_logs', ['integration_id'], unique=False)
    op.create_index('ix_gmail_import_logs_lead_id', 'gmail_import_logs', ['lead_id'], unique=False)


def downgrade():
    op.drop_table('gmail_import_logs')
    with op.batch_alter_table('leads', schema=None) as batch_op:
        batch_op.drop_constraint('uq_leads_workspace_normalized_email', type_='unique')
        batch_op.drop_index('ix_leads_source_message_id')
        batch_op.drop_index('ix_leads_normalized_phone')
        batch_op.drop_index('ix_leads_normalized_email')
        batch_op.drop_index('ix_leads_email')
        batch_op.alter_column('conversation_id', existing_type=UUID(as_uuid=True), nullable=False)
        batch_op.drop_column('updated_at')
        batch_op.drop_column('source_message_id')
        batch_op.drop_column('company')
        batch_op.drop_column('normalized_phone')
        batch_op.drop_column('normalized_email')
        batch_op.drop_column('email')
