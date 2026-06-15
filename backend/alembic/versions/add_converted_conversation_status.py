"""Add CONVERTED to ConversationStatus enum

Revision ID: add_converted_status
Revises: 
Create Date: 2026-06-05
"""
from alembic import op

revision = 'add_converted_status'
down_revision = 'ee9d22e89db3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE conversationstatus ADD VALUE IF NOT EXISTS 'CONVERTED'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values
    pass
