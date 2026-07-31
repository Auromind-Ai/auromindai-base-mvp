"""merge notification and subscription heads

Revision ID: d9f8e7d6c5b4
Revises: fb0c5db32508, h2i3j4k5l6m7
Create Date: 2026-07-24 16:52:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9f8e7d6c5b4'
down_revision: Union[str, Sequence[str], None] = ('fb0c5db32508', 'h2i3j4k5l6m7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
