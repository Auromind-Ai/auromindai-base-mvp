
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6g7'
down_revision = 'a1c2d3e4f5a6'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Check columns in workspace_members
    wm_cols = [c['name'] for c in inspector.get_columns('workspace_members')]
    if 'name' not in wm_cols:
        op.add_column('workspace_members', sa.Column('name', sa.String(length=255), nullable=True))
    if 'permissions' not in wm_cols:
        op.add_column('workspace_members', sa.Column('permissions', sa.JSON(), nullable=True))
    if 'is_active' not in wm_cols:
        op.add_column('workspace_members', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False))

    # Check columns in workspace_invitations
    if 'workspace_invitations' in inspector.get_table_names():
        inv_cols = [c['name'] for c in inspector.get_columns('workspace_invitations')]
        if 'name' not in inv_cols:
            op.add_column('workspace_invitations', sa.Column('name', sa.String(length=255), nullable=True))
        if 'permissions' not in inv_cols:
            op.add_column('workspace_invitations', sa.Column('permissions', sa.JSON(), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    wm_cols = [c['name'] for c in inspector.get_columns('workspace_members')]
    if 'is_active' in wm_cols:
        op.drop_column('workspace_members', 'is_active')
    if 'permissions' in wm_cols:
        op.drop_column('workspace_members', 'permissions')
    if 'name' in wm_cols:
        op.drop_column('workspace_members', 'name')

    if 'workspace_invitations' in inspector.get_table_names():
        inv_cols = [c['name'] for c in inspector.get_columns('workspace_invitations')]
        if 'permissions' in inv_cols:
            op.drop_column('workspace_invitations', 'permissions')
        if 'name' in inv_cols:
            op.drop_column('workspace_invitations', 'name')
