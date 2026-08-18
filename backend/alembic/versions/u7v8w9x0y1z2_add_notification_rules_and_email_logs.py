
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'u7v8w9x0y1z2'
down_revision = 't6u7v8w9x0y1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. Create notification_rules table
    if 'notification_rules' not in existing_tables:
        op.create_table(
            'notification_rules',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column('event_name', sa.String(length=100), nullable=False),
            sa.Column('template_key', sa.String(length=100), nullable=False),
            sa.Column('recipient_roles', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
            sa.Column('channels', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='["email"]'),
            sa.Column('conditions', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
            sa.Column('delay_minutes', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('dedup_window_seconds', sa.Integer(), nullable=False, server_default='86400'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index(op.f('ix_notification_rules_event_name'), 'notification_rules', ['event_name'], unique=False)
        op.create_index(op.f('ix_notification_rules_template_key'), 'notification_rules', ['template_key'], unique=False)
        op.create_index(op.f('ix_notification_rules_is_active'), 'notification_rules', ['is_active'], unique=False)

    # 2. Create email_delivery_logs table
    if 'email_delivery_logs' not in existing_tables:
        op.create_table(
            'email_delivery_logs',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column('idempotency_key', sa.String(length=255), nullable=False),
            sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='SET NULL'), nullable=True),
            sa.Column('recipient_email', sa.String(length=255), nullable=False),
            sa.Column('recipient_name', sa.String(length=255), nullable=True),
            sa.Column('recipient_role', sa.String(length=50), nullable=True),
            sa.Column('event_name', sa.String(length=100), nullable=False),
            sa.Column('template_key', sa.String(length=100), nullable=False),
            sa.Column('subject', sa.String(length=500), nullable=False),
            sa.Column('body_html', sa.Text(), nullable=False),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
            sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='3'),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('metadata_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
            sa.Column('scheduled_for', sa.DateTime(timezone=True), nullable=True),
            sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index(op.f('ix_email_delivery_logs_idempotency_key'), 'email_delivery_logs', ['idempotency_key'], unique=True)
        op.create_index(op.f('ix_email_delivery_logs_workspace_id'), 'email_delivery_logs', ['workspace_id'], unique=False)
        op.create_index(op.f('ix_email_delivery_logs_recipient_email'), 'email_delivery_logs', ['recipient_email'], unique=False)
        op.create_index(op.f('ix_email_delivery_logs_event_name'), 'email_delivery_logs', ['event_name'], unique=False)
        op.create_index(op.f('ix_email_delivery_logs_template_key'), 'email_delivery_logs', ['template_key'], unique=False)
        op.create_index(op.f('ix_email_delivery_logs_status'), 'email_delivery_logs', ['status'], unique=False)
        op.create_index(op.f('ix_email_delivery_logs_scheduled_for'), 'email_delivery_logs', ['scheduled_for'], unique=False)
        op.create_index(op.f('ix_email_delivery_logs_created_at'), 'email_delivery_logs', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_email_delivery_logs_created_at'), table_name='email_delivery_logs')
    op.drop_index(op.f('ix_email_delivery_logs_scheduled_for'), table_name='email_delivery_logs')
    op.drop_index(op.f('ix_email_delivery_logs_status'), table_name='email_delivery_logs')
    op.drop_index(op.f('ix_email_delivery_logs_template_key'), table_name='email_delivery_logs')
    op.drop_index(op.f('ix_email_delivery_logs_event_name'), table_name='email_delivery_logs')
    op.drop_index(op.f('ix_email_delivery_logs_recipient_email'), table_name='email_delivery_logs')
    op.drop_index(op.f('ix_email_delivery_logs_workspace_id'), table_name='email_delivery_logs')
    op.drop_index(op.f('ix_email_delivery_logs_idempotency_key'), table_name='email_delivery_logs')
    op.drop_table('email_delivery_logs')

    op.drop_index(op.f('ix_notification_rules_is_active'), table_name='notification_rules')
    op.drop_index(op.f('ix_notification_rules_template_key'), table_name='notification_rules')
    op.drop_index(op.f('ix_notification_rules_event_name'), table_name='notification_rules')
    op.drop_table('notification_rules')
