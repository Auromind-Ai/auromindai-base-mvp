"""add fallback routing fields

Revision ID: b457c7d1b080
Revises: d3e4f5a6b7c8
Create Date: 2026-06-26 11:33:57.126106

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b457c7d1b080'
down_revision: Union[str, Sequence[str], None] = 'd3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('model_configs', sa.Column('fallback_enabled', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('model_configs', sa.Column('fallback_provider', sa.String(length=50), nullable=True))
    op.add_column('model_configs', sa.Column('fallback_model', sa.String(length=200), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('model_configs', 'fallback_model')
    op.drop_column('model_configs', 'fallback_provider')
    op.drop_column('model_configs', 'fallback_enabled')
