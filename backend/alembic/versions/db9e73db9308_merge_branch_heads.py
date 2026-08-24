"""merge branch heads

Revision ID: db9e73db9308
Revises: 09a979eb88fd, d6e7f8g9h0i1
Create Date: 2026-08-24 06:27:58.310392

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'db9e73db9308'
down_revision: Union[str, Sequence[str], None] = ('09a979eb88fd', 'd6e7f8g9h0i1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
