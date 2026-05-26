"""add conversion fields to lead

Revision ID: d3b841a129f1
Revises: 642213736b03
Create Date: 2026-05-22 15:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3b841a129f1'
down_revision: Union[str, Sequence[str], None] = '642213736b03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('leads',
        sa.Column('conversion_amount',
                  sa.Numeric(12, 2), nullable=True))
    op.add_column('leads',
        sa.Column('converted_at',
                  sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('leads', 'converted_at')
    op.drop_column('leads', 'conversion_amount')
