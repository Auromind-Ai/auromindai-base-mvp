"""add twilio_messaging_service_sid to workspaces and content_hash to brain table

Revision ID: e2f3g4h5i6j7
Revises: d9f8e7d6c5b4
Create Date: 2026-07-27 16:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2f3g4h5i6j7'
down_revision: Union[str, Sequence[str], None] = 'd9f8e7d6c5b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'workspaces',
        sa.Column(
            'twilio_messaging_service_sid',
            sa.String(length=255),
            nullable=True
        )
    )
    op.add_column(
        'brain',
        sa.Column(
            'content_hash',
            sa.String(length=64),
            nullable=True
        )
    )
    op.create_index(
        op.f('ix_brain_content_hash'),
        'brain',
        ['content_hash'],
        unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_brain_content_hash'), table_name='brain')
    op.drop_column('brain', 'content_hash')
    op.drop_column('workspaces', 'twilio_messaging_service_sid')
