
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

# revision identifiers, used by Alembic.
revision = 'h5c6d7e8f9g0'
down_revision = 'g4b5c6d7e8f9'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add held_balance to wcc_wallets
    op.add_column(
        'wcc_wallets',
        sa.Column('held_balance', sa.Numeric(precision=12, scale=2), server_default='0.0', nullable=False)
    )

    # 2. Create campaigns table
    op.create_table(
        'campaigns',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('workspace_id', UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('campaign_type', sa.String(length=50), server_default='promotional', nullable=False),
        sa.Column('campaign_goal', sa.String(length=255), nullable=True),
        sa.Column('portfolio_id', sa.String(length=255), nullable=True),
        sa.Column('phone_number_id', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='draft', nullable=False),
        sa.Column('audience_source', sa.String(length=50), server_default='existing_contacts', nullable=False),
        sa.Column('total_recipients', sa.Integer(), server_default='0', nullable=False),
        sa.Column('valid_recipients', sa.Integer(), server_default='0', nullable=False),
        sa.Column('invalid_recipients', sa.Integer(), server_default='0', nullable=False),
        sa.Column('message_type', sa.String(length=50), server_default='template', nullable=False),
        sa.Column('template_id', UUID(as_uuid=True), sa.ForeignKey('templates.id', ondelete='SET NULL'), nullable=True),
        sa.Column('message_content', sa.Text(), nullable=True),
        sa.Column('media_url', sa.String(length=1024), nullable=True),
        sa.Column('media_type', sa.String(length=50), nullable=True),
        sa.Column('schedule_type', sa.String(length=50), server_default='now', nullable=False),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('timezone', sa.String(length=100), server_default='Asia/Kolkata', nullable=False),
        sa.Column('send_gradually', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('messages_per_minute', sa.Integer(), server_default='100', nullable=False),
        sa.Column('skip_invalid_numbers', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('stop_on_high_failure_rate', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('failure_rate_threshold', sa.Float(), server_default='10.0', nullable=False),
        sa.Column('quiet_hours_enabled', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('quiet_hours_start', sa.String(length=10), server_default='22:00', nullable=False),
        sa.Column('quiet_hours_end', sa.String(length=10), server_default='08:00', nullable=False),
        sa.Column('estimated_cost', sa.Numeric(precision=12, scale=2), server_default='0.0', nullable=False),
        sa.Column('held_cost', sa.Numeric(precision=12, scale=2), server_default='0.0', nullable=False),
        sa.Column('actual_cost', sa.Numeric(precision=12, scale=2), server_default='0.0', nullable=False),
        sa.Column('accepted_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('sent_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('delivered_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('read_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('failed_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('skipped_marketing_cap_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('paused_reason', sa.String(length=255), nullable=True),
        sa.Column('next_available_capacity_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_campaigns_workspace_id', 'campaigns', ['workspace_id'])
    op.create_index('ix_campaigns_status', 'campaigns', ['status'])
    op.create_index('ix_campaigns_ws_status', 'campaigns', ['workspace_id', 'status'])
    op.create_index('ix_campaigns_scheduled_at', 'campaigns', ['scheduled_at'])
    op.create_index('ix_campaigns_phone_number_id', 'campaigns', ['phone_number_id'])

    # 3. Create campaign_recipients table
    op.create_table(
        'campaign_recipients',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('campaign_id', UUID(as_uuid=True), sa.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False),
        sa.Column('workspace_id', UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lead_id', UUID(as_uuid=True), sa.ForeignKey('leads.id', ondelete='SET NULL'), nullable=True),
        sa.Column('phone_number', sa.String(length=50), nullable=False),
        sa.Column('normalized_phone', sa.String(length=50), nullable=False),
        sa.Column('recipient_name', sa.String(length=255), nullable=True),
        sa.Column('variables', JSONB, server_default='{}', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='pending', nullable=False),
        sa.Column('wamid', sa.String(length=255), nullable=True),
        sa.Column('error_code', sa.String(length=50), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('cost', sa.Numeric(precision=10, scale=4), server_default='0.0', nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_campaign_recipients_campaign_id', 'campaign_recipients', ['campaign_id'])
    op.create_index('ix_campaign_recipients_workspace_id', 'campaign_recipients', ['workspace_id'])
    op.create_index('ix_campaign_recipients_status', 'campaign_recipients', ['status'])
    op.create_index('ix_campaign_recipients_camp_status', 'campaign_recipients', ['campaign_id', 'status'])
    op.create_index('ix_campaign_recipients_normalized_phone', 'campaign_recipients', ['normalized_phone'])
    # Partial index strictly for webhook lookups:
    op.create_index(
        'idx_campaign_recipients_wamid',
        'campaign_recipients',
        ['wamid'],
        unique=False,
        postgresql_where=sa.text('wamid IS NOT NULL')
    )

    # 4. Create contact_lists and contact_list_members
    op.create_table(
        'contact_lists',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('workspace_id', UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('total_contacts', sa.Integer(), server_default='0', nullable=False),
        sa.Column('filter_query', JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_contact_lists_workspace_id', 'contact_lists', ['workspace_id'])

    op.create_table(
        'contact_list_members',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('contact_list_id', UUID(as_uuid=True), sa.ForeignKey('contact_lists.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lead_id', UUID(as_uuid=True), sa.ForeignKey('leads.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('contact_list_id', 'lead_id', name='uq_contact_list_member'),
    )
    op.create_index('ix_contact_list_members_contact_list_id', 'contact_list_members', ['contact_list_id'])
    op.create_index('ix_contact_list_members_lead_id', 'contact_list_members', ['lead_id'])


def downgrade():
    op.drop_table('contact_list_members')
    op.drop_table('contact_lists')
    op.drop_index('idx_campaign_recipients_wamid', table_name='campaign_recipients')
    op.drop_table('campaign_recipients')
    op.drop_table('campaigns')
    op.drop_column('wcc_wallets', 'held_balance')
