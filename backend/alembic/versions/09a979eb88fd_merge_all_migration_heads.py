"""merge all migration heads

Revision ID: 09a979eb88fd
Revises: c07b77b8f45c, e2f3g4h5i6j7, k8l9m0n1o2p3, ae40a3e8c31e
Create Date: 2026-08-13 07:54:23.396723

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '09a979eb88fd'
down_revision: Union[str, Sequence[str], None] = ('c07b77b8f45c', 'e2f3g4h5i6j7', 'k8l9m0n1o2p3', 'ae40a3e8c31e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
