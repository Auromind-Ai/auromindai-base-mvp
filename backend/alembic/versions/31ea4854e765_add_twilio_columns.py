"""add_twilio_columns

Revision ID: 31ea4854e765
Revises: 823dda78f43e
Create Date: 2026-04-09 14:35:20.144120

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '31ea4854e765'
down_revision: Union[str, Sequence[str], None] = '823dda78f43e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
