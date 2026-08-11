"""add_wcc_overage_balance

Revision ID: a5c47c227055
Revises: p1q2r3s4t5u6
Create Date: 2026-08-08 10:11:14.172578

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a5c47c227055'
down_revision: Union[str, Sequence[str], None] = 'p1q2r3s4t5u6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add overage_balance column to wcc_wallets for explicit debt tracking."""
    op.add_column(
        'wcc_wallets',
        sa.Column(
            'overage_balance',
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default='0.00'
        )
    )


def downgrade() -> None:
    """Remove overage_balance column from wcc_wallets."""
    op.drop_column('wcc_wallets', 'overage_balance')
