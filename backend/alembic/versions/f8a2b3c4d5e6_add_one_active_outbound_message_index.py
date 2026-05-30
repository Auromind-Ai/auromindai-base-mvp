"""add_one_active_outbound_message_index

Revision ID: f8a2b3c4d5e6
Revises: 55355703a799
Create Date: 2026-04-24 15:30:00.000000

Adds a partial unique index on outbound_messages to enforce that at most
ONE message per conversation can be in 'in_progress' or 'dispatched' status
at any given time.  This is a database-level guard against race conditions.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = '55355703a799'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add partial unique index: one active outbound message per conversation."""
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_outbound_messages_one_active
        ON outbound_messages (conversation_id)
        WHERE status IN ('in_progress', 'dispatched')
    """)


def downgrade() -> None:
    """Remove the partial unique index."""
    op.execute("DROP INDEX IF EXISTS ix_outbound_messages_one_active")