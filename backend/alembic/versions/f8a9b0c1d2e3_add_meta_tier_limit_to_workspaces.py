"""Add meta_tier_limit to workspaces.

Revision ID: f8a9b0c1d2e3
Revises: ('c9e2f4a6b803', 'h5c6d7e8f9g0')
Create Date: 2026-09-21
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f8a9b0c1d2e3'
down_revision = ('c9e2f4a6b803', 'h5c6d7e8f9g0')
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c["name"] for c in inspector.get_columns("workspaces")]
    if "meta_tier_limit" not in cols:
        op.add_column('workspaces', sa.Column('meta_tier_limit', sa.Integer(), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c["name"] for c in inspector.get_columns("workspaces")]
    if "meta_tier_limit" in cols:
        op.drop_column('workspaces', 'meta_tier_limit')
