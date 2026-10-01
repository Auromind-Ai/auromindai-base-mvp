"""Add variable_mapping to templates table

Revision ID: t1m2p3v4a5r6
Revises: g1h2i3j4k5l6
Create Date: 2026-09-30
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 't1m2p3v4a5r6'
down_revision = 'g1h2i3j4k5l6'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('templates')]
    if 'variable_mapping' not in columns:
        op.add_column('templates', sa.Column('variable_mapping', sa.Text(), nullable=True))
    if 'buttons' not in columns:
        op.add_column('templates', sa.Column('buttons', sa.Text(), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('templates')]
    if 'buttons' in columns:
        op.drop_column('templates', 'buttons')
    if 'variable_mapping' in columns:
        op.drop_column('templates', 'variable_mapping')
