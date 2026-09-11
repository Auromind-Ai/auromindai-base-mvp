"""add_follow_up_to_conversationstatus

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-09-03 14:45:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'f3a4b5c6d7e8'
down_revision = 'f9a0b1c2d3e4'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("COMMIT")
    op.execute("ALTER TYPE conversationstatus ADD VALUE IF NOT EXISTS 'FOLLOW_UP'")


def downgrade():
    pass
