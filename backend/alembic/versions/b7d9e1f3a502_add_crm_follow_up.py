"""Persist CRM follow-up selections.

Revision ID: b7d9e1f3a502
Revises: a8c4e2b6d901
"""
from alembic import op
import sqlalchemy as sa

revision = "b7d9e1f3a502"
down_revision = "a8c4e2b6d901"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("leads", sa.Column("is_follow_up", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    op.drop_column("leads", "is_follow_up")
