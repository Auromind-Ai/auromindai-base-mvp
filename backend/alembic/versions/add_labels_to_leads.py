"""Add labels to leads

Revision ID: add_labels_to_leads
Revises: add_converted_status
Create Date: 2026-06-09
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_labels_to_leads'
down_revision = 'add_converted_status'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add column labels to leads table
    op.add_column('leads', sa.Column('labels', sa.JSON(), nullable=True, server_default='[]'))


def downgrade() -> None:
    op.drop_column('leads', 'labels')
