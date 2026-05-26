
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e80f04b3d2e1'
down_revision: Union[str, Sequence[str], None] = '9f3c6d1a7b2e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'leads',
        sa.Column('intent_bonus', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column(
        'leads',
        sa.Column('intent_signals', postgresql.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('leads', 'intent_signals')
    op.drop_column('leads', 'intent_bonus')
