"""merge_heads

Revision ID: b2e4327d0071
Revises: a4f2c8d9e1b0, c1d2e3f4a5b6
Create Date: 2026-04-11 15:21:39.600252

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2e4327d0071'
down_revision: Union[str, Sequence[str], None] = ('a4f2c8d9e1b0', 'c1d2e3f4a5b6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass