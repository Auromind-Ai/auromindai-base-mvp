"""add_platform_role_to_users

Revision ID: e5f6g7h8i9j0
Revises: d3e4f5a6b7c8
Create Date: 2026-07-06 17:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e5f6g7h8i9j0'
down_revision: Union[str, Sequence[str], None] = 'd3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add platform_role column to users table
    op.add_column(
        'users',
        sa.Column(
            'platform_role',
            sa.String(length=50),
            nullable=False,
            server_default='user'
        )
    )


def downgrade() -> None:
    op.drop_column('users', 'platform_role')
