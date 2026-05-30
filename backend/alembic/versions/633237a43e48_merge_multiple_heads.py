"""merge multiple heads

Revision ID: 633237a43e48
Revises: ab76767673f3, b2c3d4e5f6a8
Create Date: 2026-05-27 12:56:58.488158

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '633237a43e48'
down_revision: Union[str, Sequence[str], None] = ('ab76767673f3', 'b2c3d4e5f6a8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
