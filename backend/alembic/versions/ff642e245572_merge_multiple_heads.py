"""merge_multiple_heads

Revision ID: ff642e245572
Revises: a1236d54284b, eff0dfabf280
Create Date: 2026-06-16 07:11:50.416969

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ff642e245572'
down_revision: Union[str, Sequence[str], None] = ('a1236d54284b', 'eff0dfabf280')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
