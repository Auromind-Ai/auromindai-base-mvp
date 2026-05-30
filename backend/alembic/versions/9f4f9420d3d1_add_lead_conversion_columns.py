"""add_lead_conversion_columns

Revision ID: 9f4f9420d3d1
Revises: e7556a02ed4b
Create Date: 2026-05-30 08:43:48.568002

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f4f9420d3d1'
down_revision: Union[str, Sequence[str], None] = 'e7556a02ed4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('leads', sa.Column('is_converted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('leads', sa.Column('converted_product', sa.String(length=255), nullable=True))
    op.add_column('leads', sa.Column('conversion_notes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('leads', 'conversion_notes')
    op.drop_column('leads', 'converted_product')
    op.drop_column('leads', 'is_converted')
