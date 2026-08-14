"""alter_plan_prices_to_float

Revision ID: q3r4s5t6u7v8
Revises: a5c47c227055
Create Date: 2026-08-10 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'q3r4s5t6u7v8'
down_revision: Union[str, Sequence[str], None] = 'a5c47c227055'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Alter column types in plans table from INTEGER to FLOAT (DOUBLE PRECISION)
    op.alter_column('plans', 'price', type_=sa.Float(), existing_type=sa.Integer())
    op.alter_column('plans', 'monthly_price', type_=sa.Float(), existing_type=sa.Integer())
    op.alter_column('plans', 'yearly_price', type_=sa.Float(), existing_type=sa.Integer())

    # 2. Update existing truncated plan prices (e.g. 847 -> 847.46) in database
    op.execute("UPDATE plans SET monthly_price = 847.46, price = 847.46 WHERE monthly_price = 847 OR name IN ('pro', 'solo')")


def downgrade() -> None:
    op.alter_column('plans', 'price', type_=sa.Integer(), existing_type=sa.Float())
    op.alter_column('plans', 'monthly_price', type_=sa.Integer(), existing_type=sa.Float())
    op.alter_column('plans', 'yearly_price', type_=sa.Integer(), existing_type=sa.Float())
