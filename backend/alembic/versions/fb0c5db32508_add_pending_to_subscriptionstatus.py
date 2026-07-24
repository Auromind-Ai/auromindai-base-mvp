"""add pending to subscriptionstatus

Revision ID: fb0c5db32508
Revises: e12c1e789676
Create Date: 2026-07-16 07:17:11.399721

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fb0c5db32508'
down_revision: Union[str, Sequence[str], None] = 'e12c1e789676'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE subscriptionstatus ADD VALUE IF NOT EXISTS 'pending'")


def downgrade() -> None:
    """Downgrade schema."""
    # PostgreSQL does not support dropping a value from an enum type easily, so we pass.
    pass

