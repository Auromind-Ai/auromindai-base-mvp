"""merge all heads

Revision ID: e8f9a0b1c2d3
Revises: 5a2ba18233bd, b2c3d4e5f6a7, c7d8e9f0a1b2
Create Date: 2026-08-26 09:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8f9a0b1c2d3'
down_revision: Union[str, Sequence[str], None] = ('5a2ba18233bd', 'b2c3d4e5f6a7', 'c7d8e9f0a1b2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
