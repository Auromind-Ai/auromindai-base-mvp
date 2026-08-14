"""add entitlement reset columns to subscriptions and balance breakdown to wcc_wallets

Revision ID: m0n1o2p3q4r5
Revises: 575b65956f82, k8l9m0n1o2p3, e2f3g4h5i6j7, l9m0n1o2p3q4
Create Date: 2026-08-08 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'm0n1o2p3q4r5'
down_revision: Union[str, Sequence[str], None] = ('575b65956f82', 'k8l9m0n1o2p3', 'e2f3g4h5i6j7', 'l9m0n1o2p3q4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add last_entitlement_reset_at and next_entitlement_reset_at to subscriptions
    op.add_column('subscriptions', sa.Column('last_entitlement_reset_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('subscriptions', sa.Column('next_entitlement_reset_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_subscriptions_next_entitlement_reset_at'), 'subscriptions', ['next_entitlement_reset_at'], unique=False)
    
    # Backfill subscription entitlement reset dates based on current period start/end
    op.execute("""
        UPDATE subscriptions 
        SET last_entitlement_reset_at = current_period_start 
        WHERE last_entitlement_reset_at IS NULL AND current_period_start IS NOT NULL
    """)
    op.execute("""
        UPDATE subscriptions 
        SET next_entitlement_reset_at = current_period_end 
        WHERE next_entitlement_reset_at IS NULL AND current_period_end IS NOT NULL
    """)

    # 2. Add included_balance and purchased_balance to wcc_wallets
    op.add_column('wcc_wallets', sa.Column('included_balance', sa.Numeric(precision=12, scale=2), server_default='0.00', nullable=False))
    op.add_column('wcc_wallets', sa.Column('purchased_balance', sa.Numeric(precision=12, scale=2), server_default='0.00', nullable=False))
    
    # Backfill purchased_balance from existing balance where balance > 0
    op.execute("""
        UPDATE wcc_wallets 
        SET purchased_balance = balance 
        WHERE balance > 0
    """)


def downgrade() -> None:
    # Drop wcc_wallets balance breakdown columns
    op.drop_column('wcc_wallets', 'purchased_balance')
    op.drop_column('wcc_wallets', 'included_balance')

    # Drop subscriptions entitlement reset columns and index
    op.drop_index(op.f('ix_subscriptions_next_entitlement_reset_at'), table_name='subscriptions')
    op.drop_column('subscriptions', 'next_entitlement_reset_at')
    op.drop_column('subscriptions', 'last_entitlement_reset_at')
