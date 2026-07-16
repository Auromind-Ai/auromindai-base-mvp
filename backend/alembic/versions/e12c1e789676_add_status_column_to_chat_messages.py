"""add_status_column_to_chat_messages

Revision ID: e12c1e789676
Revises: ff3726b9699e
Create Date: 2026-07-15 16:47:33.546854

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e12c1e789676'
down_revision: Union[str, Sequence[str], None] = 'ff3726b9699e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'chat_messages',
        sa.Column(
            'status',
            sa.String(length=50),
            nullable=False,
            server_default='COMPLETED'
        )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('chat_messages', 'status')
