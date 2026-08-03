"""merge migration heads

Revision ID: c07b77b8f45c
Revises: 49575a1bfb95, d9f8e7d6c5b4
Create Date: 2026-07-30 11:24:06.379877

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c07b77b8f45c'
down_revision: Union[str, Sequence[str], None] = ('49575a1bfb95', 'd9f8e7d6c5b4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
