"""add_repeat_tracking_and_contact_field

Revision ID: 0e020fe443f0
Revises: 7d413a9a4059
Create Date: 2026-04-17 11:28:09.404825

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '0e020fe443f0'
down_revision: Union[str, Sequence[str], None] = '7d413a9a4059'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name, column_name):
    """Check if a column already exists in the table."""
    bind = op.get_bind()
    insp = inspect(bind)
    columns = [c['name'] for c in insp.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """Add repeat_count, last_message_hash to conversation_states and contact to leads."""
    if not _column_exists('conversation_states', 'repeat_count'):
        op.add_column('conversation_states', sa.Column('repeat_count', sa.Integer(), nullable=True, server_default='0'))

    if not _column_exists('conversation_states', 'last_message_hash'):
        op.add_column('conversation_states', sa.Column('last_message_hash', sa.String(length=64), nullable=True))

    if not _column_exists('leads', 'contact'):
        op.add_column('leads', sa.Column('contact', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Remove repeat_count, last_message_hash from conversation_states and contact from leads."""
    if _column_exists('leads', 'contact'):
        op.drop_column('leads', 'contact')

    if _column_exists('conversation_states', 'last_message_hash'):
        op.drop_column('conversation_states', 'last_message_hash')

    if _column_exists('conversation_states', 'repeat_count'):
        op.drop_column('conversation_states', 'repeat_count')
