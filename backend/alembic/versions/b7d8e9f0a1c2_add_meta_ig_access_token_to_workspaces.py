"""Add the dedicated Instagram access token to workspaces.

Revision ID: b7d8e9f0a1c2
Revises: a8b9c0d1e2f3, t1m2p3v4a5r6
"""
from alembic import op
import sqlalchemy as sa


revision = 'b7d8e9f0a1c2'
down_revision = ('a8b9c0d1e2f3', 't1m2p3v4a5r6')
branch_labels = None
depends_on = None


def upgrade():
    columns = sa.inspect(op.get_bind()).get_columns('workspaces')
    if not any(column['name'] == 'meta_ig_access_token' for column in columns):
        op.add_column(
            'workspaces',
            sa.Column('meta_ig_access_token', sa.Text(), nullable=True),
        )


def downgrade():
    op.drop_column('workspaces', 'meta_ig_access_token')
