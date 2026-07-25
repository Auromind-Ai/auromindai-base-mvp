"""add_pending_to_subscriptionstatus

Revision ID: 49575a1bfb95
Revises: e7f8g9h0i1j2
Create Date: 2026-07-25 05:24:31.012750

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '49575a1bfb95'
down_revision: Union[str, Sequence[str], None] = 'e7f8g9h0i1j2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("COMMIT")
    op.execute("ALTER TYPE subscriptionstatus ADD VALUE IF NOT EXISTS 'pending'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
