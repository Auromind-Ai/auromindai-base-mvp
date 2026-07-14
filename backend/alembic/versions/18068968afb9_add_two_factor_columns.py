"""add two factor columns

Revision ID: 18068968afb9
Revises: b457c7d1b080
Create Date: 2026-07-06 12:01:52.160457

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '18068968afb9'
down_revision: Union[str, Sequence[str], None] = 'b457c7d1b080'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
