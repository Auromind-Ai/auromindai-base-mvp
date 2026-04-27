"""add_meta_ig_id_column

Revision ID: 823dda78f43e
Revises: bfb5103dad12
Create Date: 2026-04-09 14:33:50.640710

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '823dda78f43e'
down_revision: Union[str, Sequence[str], None] = 'bfb5103dad12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
