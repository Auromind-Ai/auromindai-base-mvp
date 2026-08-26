"""add calendar_event client fields

Revision ID: b2c3d4e5f6a7
Revises: ('d6e7f8g9h0i1', 'a1b2c3d4e5f6')
Create Date: 2026-08-25 18:52:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = ('d6e7f8g9h0i1', 'a1b2c3d4e5f6')
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    columns = [c['name'] for c in inspector.get_columns('calendar_events')] if 'calendar_events' in tables else []

    if 'client_name' not in columns:
        op.add_column('calendar_events', sa.Column('client_name', sa.String(), nullable=True))
    if 'client_email' not in columns:
        op.add_column('calendar_events', sa.Column('client_email', sa.String(), nullable=True))
    if 'client_phone' not in columns:
        op.add_column('calendar_events', sa.Column('client_phone', sa.String(), nullable=True))
    if 'meet_link' not in columns:
        op.add_column('calendar_events', sa.Column('meet_link', sa.String(), nullable=True))
    if 'conversation_id' not in columns:
        op.add_column('calendar_events', sa.Column('conversation_id', UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='SET NULL'), nullable=True))
    if 'updated_at' not in columns:
        op.add_column('calendar_events', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))

    if 'calendar_events' in tables:
        indexes = [ix['name'] for ix in inspector.get_indexes('calendar_events')]
        if 'ix_calendar_events_conversation_id' not in indexes:
            try:
                op.create_index('ix_calendar_events_conversation_id', 'calendar_events', ['conversation_id'])
            except Exception:
                pass


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if 'calendar_events' in tables:
        indexes = [ix['name'] for ix in inspector.get_indexes('calendar_events')]
        if 'ix_calendar_events_conversation_id' in indexes:
            try:
                op.drop_index('ix_calendar_events_conversation_id', table_name='calendar_events')
            except Exception:
                pass
        columns = [c['name'] for c in inspector.get_columns('calendar_events')]
        if 'updated_at' in columns:
            op.drop_column('calendar_events', 'updated_at')
        if 'conversation_id' in columns:
            op.drop_column('calendar_events', 'conversation_id')
        if 'meet_link' in columns:
            op.drop_column('calendar_events', 'meet_link')
        if 'client_phone' in columns:
            op.drop_column('calendar_events', 'client_phone')
        if 'client_email' in columns:
            op.drop_column('calendar_events', 'client_email')
        if 'client_name' in columns:
            op.drop_column('calendar_events', 'client_name')
