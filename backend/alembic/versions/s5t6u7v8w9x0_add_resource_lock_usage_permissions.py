"""add_resource_lock_usage_permissions

Revision ID: s5t6u7v8w9x0
Revises: r4s5t6u7v8w9
Create Date: 2026-08-10 16:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 's5t6u7v8w9x0'
down_revision: Union[str, Sequence[str], None] = 'r4s5t6u7v8w9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('plan_entitlements')]

    if 'allow_purchased_ai_usage' not in columns:
        op.add_column(
            'plan_entitlements',
            sa.Column('allow_purchased_ai_usage', sa.Boolean(), nullable=False, server_default=sa.text('true'))
        )

    if 'allow_purchased_wcc_usage' not in columns:
        op.add_column(
            'plan_entitlements',
            sa.Column('allow_purchased_wcc_usage', sa.Boolean(), nullable=False, server_default=sa.text('true'))
        )

    if 'allow_flow_addon' not in columns:
        op.add_column(
            'plan_entitlements',
            sa.Column('allow_flow_addon', sa.Boolean(), nullable=False, server_default=sa.text('true'))
        )

    if 'allow_purchased_flow_usage' not in columns:
        op.add_column(
            'plan_entitlements',
            sa.Column('allow_purchased_flow_usage', sa.Boolean(), nullable=False, server_default=sa.text('true'))
        )

    # Set Free Plan entitlements default usage and addon permissions to False
    op.execute("""
        UPDATE plan_entitlements
        SET allow_purchased_ai_usage = false,
            allow_purchased_wcc_usage = false,
            allow_flow_addon = false,
            allow_purchased_flow_usage = false
        WHERE plan_id IN (
            SELECT id FROM plans WHERE LOWER(name) = 'free'
        );
    """)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('plan_entitlements')]

    if 'allow_purchased_flow_usage' in columns:
        op.drop_column('plan_entitlements', 'allow_purchased_flow_usage')

    if 'allow_flow_addon' in columns:
        op.drop_column('plan_entitlements', 'allow_flow_addon')

    if 'allow_purchased_wcc_usage' in columns:
        op.drop_column('plan_entitlements', 'allow_purchased_wcc_usage')

    if 'allow_purchased_ai_usage' in columns:
        op.drop_column('plan_entitlements', 'allow_purchased_ai_usage')
