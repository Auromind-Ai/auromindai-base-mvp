
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c91261414a7'
down_revision: Union[str, Sequence[str], None] = '4850d34b7159'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.drop_column('leads', 'intent_bonus')


def downgrade() -> None:
    """Downgrade schema."""

    op.add_column(
        'leads',
        sa.Column(
            'intent_bonus',
            sa.Integer(),
            nullable=True,
            server_default='0'
        )
    )