"""merge platform role and wcc cost migrations

Revision ID: 0f26cd1bb2e8
Revises: 63e5cf027ae7, e5f6g7h8i9j0
Create Date: 2026-07-15 20:44:39.826585

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0f26cd1bb2e8'
down_revision: Union[str, Sequence[str], None] = ('63e5cf027ae7', 'e5f6g7h8i9j0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
