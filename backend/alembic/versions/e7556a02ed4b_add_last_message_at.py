"""add last_message_at

Revision ID: e7556a02ed4b
Revises: 33c359e5cf2d
Create Date: 2026-05-28 09:35:41.733444

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7556a02ed4b'
down_revision: Union[str, Sequence[str], None] = '33c359e5cf2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('conversations', sa.Column('last_message_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))


def downgrade() -> None:
    op.drop_column('conversations', 'last_message_at')
