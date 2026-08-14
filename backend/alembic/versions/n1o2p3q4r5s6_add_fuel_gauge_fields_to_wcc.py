"""add fuel gauge fields to wcc_transactions and wcc_recharge_logs

Revision ID: n1o2p3q4r5s6
Revises: m0n1o2p3q4r5
Create Date: 2026-08-08 12:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'n1o2p3q4r5s6'
down_revision: Union[str, Sequence[str], None] = 'm0n1o2p3q4r5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add transaction_type to wcc_transactions
    op.add_column(
        'wcc_transactions',
        sa.Column('transaction_type', sa.String(length=50), server_default='debit', nullable=True)
    )
    op.execute("UPDATE wcc_transactions SET transaction_type = 'debit' WHERE transaction_type IS NULL")

    # 2. Add balance_after to wcc_recharge_logs
    op.add_column(
        'wcc_recharge_logs',
        sa.Column('balance_after', sa.Numeric(precision=12, scale=2), nullable=True)
    )
    op.execute("UPDATE wcc_recharge_logs SET balance_after = amount WHERE balance_after IS NULL AND status = 'success'")


def downgrade() -> None:
    op.drop_column('wcc_recharge_logs', 'balance_after')
    op.drop_column('wcc_transactions', 'transaction_type')
