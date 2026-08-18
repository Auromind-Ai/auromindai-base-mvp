
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'v8w9x0y1z2a3'
down_revision = 'u7v8w9x0y1z2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'notification_schedules' not in existing_tables:
        op.create_table(
            'notification_schedules',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column('event_name', sa.String(length=100), nullable=False),
            sa.Column('display_name', sa.String(length=150), nullable=False),
            sa.Column('description', sa.String(length=255), nullable=True),
            sa.Column('schedule_type', sa.String(length=50), nullable=False, server_default='daily'),
            sa.Column('time_of_day', sa.String(length=10), nullable=True, server_default='08:00'),
            sa.Column('day_of_week', sa.String(length=20), nullable=True, server_default='monday'),
            sa.Column('interval_minutes', sa.Integer(), nullable=True),
            sa.Column('default_timezone', sa.String(length=50), nullable=False, server_default='Asia/Kolkata'),
            sa.Column('last_run_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('next_run_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('config_json', sa.JSON(), nullable=True, server_default='{}'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('event_name', name='uq_notification_schedule_event')
        )
        op.create_index('ix_notification_schedules_next_run', 'notification_schedules', ['is_active', 'next_run_at'])
        op.create_index('ix_notification_schedules_event', 'notification_schedules', ['event_name'])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'notification_schedules' in existing_tables:
        op.drop_table('notification_schedules')
