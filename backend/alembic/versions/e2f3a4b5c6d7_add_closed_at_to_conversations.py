"""add closed_at to conversations

Revision ID: e2f3a4b5c6d7
Revises: d6e7f8g9h0i1
Create Date: 2026-08-31 15:38:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e2f3a4b5c6d7'
down_revision = 'd6e7f8g9h0i1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('conversations', sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('conversations', 'closed_at')
