"""merge multiple heads

Revision ID: 14f2041764be
Revises: ab76767673f3, fd44bd45eca9
Create Date: 2026-05-26 07:38:35.200369

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '14f2041764be'
down_revision: Union[str, Sequence[str], None] = ('ab76767673f3', 'fd44bd45eca9')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
