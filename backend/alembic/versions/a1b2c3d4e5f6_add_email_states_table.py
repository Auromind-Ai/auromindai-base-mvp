"""add email_states table

Revision ID: a1b2c3d4e5f6
Revises: z2a3b4c5d6e7
Create Date: 2026-08-25 15:38:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'z2a3b4c5d6e7'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'email_states' not in tables:
        op.create_table(
            'email_states',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('workspace_id', UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
            sa.Column('last_email_id', sa.String(length=255), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        )

    inspector = sa.inspect(bind)
    if 'email_states' in inspector.get_table_names():
        indexes = [ix['name'] for ix in inspector.get_indexes('email_states')]
        if 'ix_email_states_workspace_id' not in indexes:
            try:
                op.create_index('ix_email_states_workspace_id', 'email_states', ['workspace_id'], unique=True)
            except Exception:
                pass


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'email_states' in inspector.get_table_names():
        indexes = [ix['name'] for ix in inspector.get_indexes('email_states')]
        if 'ix_email_states_workspace_id' in indexes:
            try:
                op.drop_index('ix_email_states_workspace_id', table_name='email_states')
            except Exception:
                pass
        op.drop_table('email_states')
