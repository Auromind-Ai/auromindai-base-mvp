"""add_unique_constraint_to_plan_entitlements

Revision ID: r4s5t6u7v8w9
Revises: q3r4s5t6u7v8
Create Date: 2026-08-10 14:42:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'r4s5t6u7v8w9'
down_revision: Union[str, Sequence[str], None] = 'q3r4s5t6u7v8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Deduplicate existing plan_entitlements keeping the latest created_at row per plan_id
    op.execute("""
        DELETE FROM plan_entitlements
        WHERE id NOT IN (
            SELECT DISTINCT ON (plan_id) id
            FROM plan_entitlements
            ORDER BY plan_id, created_at DESC
        );
    """)

    # 2. Ensure unique constraint on plan_entitlements(plan_id)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    constraints = [c['name'] for c in inspector.get_unique_constraints('plan_entitlements')]
    if 'uq_plan_entitlements_plan_id' not in constraints:
        op.create_unique_constraint(
            'uq_plan_entitlements_plan_id',
            'plan_entitlements',
            ['plan_id']
        )


def downgrade() -> None:
    op.drop_constraint('uq_plan_entitlements_plan_id', 'plan_entitlements', type_='unique')
