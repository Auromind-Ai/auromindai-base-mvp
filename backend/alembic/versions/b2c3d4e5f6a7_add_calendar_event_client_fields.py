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
    op.add_column('calendar_events', sa.Column('client_name', sa.String(), nullable=True))
    op.add_column('calendar_events', sa.Column('client_email', sa.String(), nullable=True))
    op.add_column('calendar_events', sa.Column('client_phone', sa.String(), nullable=True))
    op.add_column('calendar_events', sa.Column('meet_link', sa.String(), nullable=True))
    op.add_column('calendar_events', sa.Column('conversation_id', UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='SET NULL'), nullable=True))
    op.add_column('calendar_events', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_calendar_events_conversation_id', 'calendar_events', ['conversation_id'])


def downgrade():
    op.drop_index('ix_calendar_events_conversation_id', table_name='calendar_events')
    op.drop_column('calendar_events', 'updated_at')
    op.drop_column('calendar_events', 'conversation_id')
    op.drop_column('calendar_events', 'meet_link')
    op.drop_column('calendar_events', 'client_phone')
    op.drop_column('calendar_events', 'client_email')
    op.drop_column('calendar_events', 'client_name')
