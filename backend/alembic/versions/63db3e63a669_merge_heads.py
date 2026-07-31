"""merge_heads

Revision ID: 63db3e63a669
Revises: 49575a1bfb95, 9a8b7c6d5e4f, d9f8e7d6c5b4
Create Date: 2026-07-30 11:57:41.477828

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '63db3e63a669'
down_revision: Union[str, Sequence[str], None] = ('49575a1bfb95', '9a8b7c6d5e4f', 'd9f8e7d6c5b4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
