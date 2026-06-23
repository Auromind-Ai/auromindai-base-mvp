"""merge heads

Revision ID: 6d072d5f00f1
Revises: 75557343d9f7, c1d13b97eac8
Create Date: 2026-06-22 11:51:53.237410

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6d072d5f00f1'
down_revision: Union[str, Sequence[str], None] = ('c157f3af63c4', 'c1d13b97eac8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
