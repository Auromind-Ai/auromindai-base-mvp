"""Add DELIVERED and FAILED to MessageStatus

Revision ID: ab76767673f3
Revises: 39ced29854e5
Create Date: 2026-05-25 15:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab76767673f3'
down_revision: Union[str, Sequence[str], None] = '39ced29854e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use autocommit block to add new enum values to Postgres native type
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE messagestatus ADD VALUE 'DELIVERED'")
        op.execute("ALTER TYPE messagestatus ADD VALUE 'FAILED'")


def downgrade() -> None:
    # Removing elements from Postgres enums is not directly supported without dropping/recreating the enum type.
    # We will leave this as a no-op.
    pass
