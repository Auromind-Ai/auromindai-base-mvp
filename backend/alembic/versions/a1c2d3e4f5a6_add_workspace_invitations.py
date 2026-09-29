
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1c2d3e4f5a6'
down_revision = 'f8a9b0c1d2e3'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'workspace_invitations' not in tables:
        op.create_table(
            'workspace_invitations',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('role', sa.String(length=50), nullable=False, server_default='admin'),
            sa.Column('token', sa.String(length=255), nullable=False),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
            sa.Column('invited_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index('ix_workspace_invitations_workspace_id', 'workspace_invitations', ['workspace_id'])
        op.create_index('ix_workspace_invitations_email', 'workspace_invitations', ['email'])
        op.create_index('ix_workspace_invitations_token', 'workspace_invitations', ['token'], unique=True)


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'workspace_invitations' in tables:
        op.drop_table('workspace_invitations')
