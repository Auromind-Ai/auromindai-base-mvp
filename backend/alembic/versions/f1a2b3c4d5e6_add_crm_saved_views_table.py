"""add_crm_saved_views_table

Revision ID: f1a2b3c4d5e6
Revises: g4b5c6d7e8f9
Create Date: 2026-09-19 12:30:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'f1a2b3c4d5e6'
down_revision = 'g4b5c6d7e8f9'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'crm_saved_views' not in tables:
        op.create_table(
            'crm_saved_views',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('workspace_id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('filters', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_crm_saved_views_workspace_id', 'crm_saved_views', ['workspace_id'], unique=False)
        op.create_index('ix_crm_saved_views_user_id', 'crm_saved_views', ['user_id'], unique=False)


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'crm_saved_views' in inspector.get_table_names():
        op.drop_table('crm_saved_views')
