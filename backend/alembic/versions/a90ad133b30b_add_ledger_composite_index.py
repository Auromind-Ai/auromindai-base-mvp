"""add_ledger_composite_index

Revision ID: a90ad133b30b
Revises: c38fa3b4e462
Create Date: 2026-06-19 06:11:19.320865

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a90ad133b30b'
down_revision: Union[str, Sequence[str], None] = 'c38fa3b4e462'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(
        'ix_token_ledger_workspace_status_source',
        'token_ledger',
        ['workspace_id', 'status', 'balance_source'],
        unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_token_ledger_workspace_status_source', table_name='token_ledger')
