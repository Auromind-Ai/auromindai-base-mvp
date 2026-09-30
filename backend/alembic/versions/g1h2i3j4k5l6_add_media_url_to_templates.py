"""Add media_url to templates table

Revision ID: g1h2i3j4k5l6
Revises: f8a9b0c1d2e3
Create Date: 2026-09-24
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'g1h2i3j4k5l6'
down_revision = 'f8a9b0c1d2e3'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('templates')]
    if 'media_url' not in columns:
        op.add_column('templates', sa.Column('media_url', sa.Text(), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('templates')]
    if 'media_url' in columns:
        op.drop_column('templates', 'media_url')
