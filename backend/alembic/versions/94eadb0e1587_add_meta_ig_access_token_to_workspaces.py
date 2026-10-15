"""add_meta_ig_access_token_to_workspaces

Revision ID: 94eadb0e1587
Revises: ('a8b9c0d1e2f3', 't1m2p3v4a5r6')
Create Date: 2026-10-13 12:27:59.402916

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '94eadb0e1587'
down_revision: Union[str, Sequence[str], None] = ('a8b9c0d1e2f3', 't1m2p3v4a5r6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('workspaces')]
    if 'meta_ig_access_token' not in columns:
        op.add_column('workspaces', sa.Column('meta_ig_access_token', sa.Text(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('workspaces')]
    if 'meta_ig_access_token' in columns:
        op.drop_column('workspaces', 'meta_ig_access_token')
