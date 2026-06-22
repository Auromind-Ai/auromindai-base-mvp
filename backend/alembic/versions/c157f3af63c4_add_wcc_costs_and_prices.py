"""add_wcc_costs_and_prices

Revision ID: c157f3af63c4
Revises: 75557343d9f7
Create Date: 2026-06-22 06:59:58.035724

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c157f3af63c4'
down_revision: Union[str, Sequence[str], None] = '75557343d9f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add new columns as nullable
    op.add_column('wcc_rate_cards', sa.Column('meta_cost', sa.Numeric(precision=8, scale=4), nullable=True))
    op.add_column('wcc_rate_cards', sa.Column('customer_price', sa.Numeric(precision=8, scale=4), nullable=True))
    op.add_column('wcc_rate_cards', sa.Column('effective_to', sa.DateTime(timezone=True), nullable=True))

    op.add_column('wcc_transactions', sa.Column('meta_cost_applied', sa.Numeric(precision=8, scale=4), nullable=True))
    op.add_column('wcc_transactions', sa.Column('customer_price_applied', sa.Numeric(precision=8, scale=4), nullable=True))
    op.add_column('wcc_transactions', sa.Column('pricing_version', sa.Integer(), server_default='1', nullable=True))

    # 2. Add indexes
    op.create_index('ix_wcc_rate_cards_effective_range', 'wcc_rate_cards', ['category', 'region', 'is_active', 'effective_from', 'effective_to'], unique=False)
    op.create_index('ix_wcc_transactions_category', 'wcc_transactions', ['category'], unique=False)

    # 3. Backfill wcc_rate_cards with defaults for India region
    op.execute(
        """
        UPDATE wcc_rate_cards
        SET 
            meta_cost = CASE 
                WHEN category = 'marketing' THEN 1.09
                WHEN category = 'utility' THEN 0.145
                WHEN category = 'authentication' THEN 0.145
                WHEN category = 'service' THEN 0.00
                ELSE 0.00
            END,
            customer_price = CASE 
                WHEN category = 'marketing' THEN 1.25
                WHEN category = 'utility' THEN 0.18
                WHEN category = 'authentication' THEN 0.18
                WHEN category = 'service' THEN 0.05
                ELSE 0.05
            END
        WHERE meta_cost IS NULL OR customer_price IS NULL;
        """
    )

    # Ensure any remaining nulls (safety fallback)
    op.execute("UPDATE wcc_rate_cards SET meta_cost = 0.00, customer_price = 0.05 WHERE meta_cost IS NULL;")

    # 4. Backfill wcc_transactions from legacy fields safely without guessing
    op.execute(
        """
        UPDATE wcc_transactions
        SET 
            meta_cost_applied = rate_applied,
            customer_price_applied = debit_amount,
            pricing_version = 1
        WHERE meta_cost_applied IS NULL OR customer_price_applied IS NULL;
        """
    )

    # Safety fallback
    op.execute("UPDATE wcc_transactions SET meta_cost_applied = 0.00, customer_price_applied = 0.00 WHERE meta_cost_applied IS NULL;")

    # 5. Set columns to NOT NULL
    op.alter_column('wcc_rate_cards', 'meta_cost', existing_type=sa.Numeric(precision=8, scale=4), nullable=False)
    op.alter_column('wcc_rate_cards', 'customer_price', existing_type=sa.Numeric(precision=8, scale=4), nullable=False)

    op.alter_column('wcc_transactions', 'meta_cost_applied', existing_type=sa.Numeric(precision=8, scale=4), nullable=False)
    op.alter_column('wcc_transactions', 'customer_price_applied', existing_type=sa.Numeric(precision=8, scale=4), nullable=False)
    op.alter_column('wcc_transactions', 'pricing_version', existing_type=sa.Integer(), nullable=False)

    # 6. Add Database constraints
    op.create_check_constraint(
        'chk_wcc_rate_card_values',
        'wcc_rate_cards',
        'customer_price >= meta_cost AND meta_cost >= 0 AND customer_price > 0'
    )
    op.create_check_constraint(
        'chk_wcc_transaction_values',
        'wcc_transactions',
        'customer_price_applied >= meta_cost_applied AND meta_cost_applied >= 0 AND customer_price_applied >= 0'
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop constraints
    op.drop_constraint('chk_wcc_transaction_values', 'wcc_transactions', type_='check')
    op.drop_constraint('chk_wcc_rate_card_values', 'wcc_rate_cards', type_='check')

    # Drop indexes
    op.drop_index('ix_wcc_transactions_category', table_name='wcc_transactions')
    op.drop_index('ix_wcc_rate_cards_effective_range', table_name='wcc_rate_cards')

    # Drop columns
    op.drop_column('wcc_transactions', 'pricing_version')
    op.drop_column('wcc_transactions', 'customer_price_applied')
    op.drop_column('wcc_transactions', 'meta_cost_applied')

    op.drop_column('wcc_rate_cards', 'effective_to')
    op.drop_column('wcc_rate_cards', 'customer_price')
    op.drop_column('wcc_rate_cards', 'meta_cost')
