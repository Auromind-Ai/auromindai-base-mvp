"""add_workspace_resource_overrides

Revision ID: t6u7v8w9x0y1
Revises: s5t6u7v8w9x0
Create Date: 2026-08-10 16:38:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 't6u7v8w9x0y1'
down_revision: Union[str, Sequence[str], None] = 's5t6u7v8w9x0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('workspaces')]

    if 'override_allow_purchased_ai_usage' not in columns:
        op.add_column(
            'workspaces',
            sa.Column('override_allow_purchased_ai_usage', sa.Boolean(), nullable=True, default=None)
        )

    if 'override_allow_purchased_wcc_usage' not in columns:
        op.add_column(
            'workspaces',
            sa.Column('override_allow_purchased_wcc_usage', sa.Boolean(), nullable=True, default=None)
        )

    if 'override_allow_purchased_flow_usage' not in columns:
        op.add_column(
            'workspaces',
            sa.Column('override_allow_purchased_flow_usage', sa.Boolean(), nullable=True, default=None)
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('workspaces')]

    if 'override_allow_purchased_flow_usage' in columns:
        op.drop_column('workspaces', 'override_allow_purchased_flow_usage')

    if 'override_allow_purchased_wcc_usage' in columns:
        op.drop_column('workspaces', 'override_allow_purchased_wcc_usage')

    if 'override_allow_purchased_ai_usage' in columns:
        op.drop_column('workspaces', 'override_allow_purchased_ai_usage')
