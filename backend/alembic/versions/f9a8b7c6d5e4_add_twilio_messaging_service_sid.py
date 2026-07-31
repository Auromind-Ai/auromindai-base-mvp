"""add twilio_messaging_service_sid to workspaces

Revision ID: f9a8b7c6d5e4
Revises: b457c7d1b080, e12c1e789676
Create Date: 2026-07-24 15:48:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f9a8b7c6d5e4'
down_revision: Union[str, Sequence[str], None] = ('b457c7d1b080', 'e12c1e789676')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('workspaces')]
    if 'twilio_messaging_service_sid' not in columns:
        op.add_column('workspaces', sa.Column('twilio_messaging_service_sid', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('workspaces')]
    if 'twilio_messaging_service_sid' in columns:
        op.drop_column('workspaces', 'twilio_messaging_service_sid')
