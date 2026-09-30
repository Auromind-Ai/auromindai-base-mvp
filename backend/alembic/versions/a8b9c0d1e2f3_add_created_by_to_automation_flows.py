"""Add created_by to automation_flows table and backfill from workspaces

Revision ID: a8b9c0d1e2f3
Revises: ('f9b8c7d6e5a4', 'g1h2i3j4k5l6')
Create Date: 2026-09-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = 'a8b9c0d1e2f3'
down_revision = ('f9b8c7d6e5a4', 'g1h2i3j4k5l6')
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('automation_flows')]
    if 'created_by' not in columns:
        op.add_column(
            'automation_flows',
            sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
        )
        op.create_index(
            op.f('ix_automation_flows_created_by'),
            'automation_flows',
            ['created_by'],
            unique=False
        )
        
        # Backfill existing flows with workspace creator if available
        try:
            op.execute(
                """
                UPDATE automation_flows af
                SET created_by = w.created_by
                FROM workspaces w
                WHERE af.workspace_id = w.id AND af.created_by IS NULL AND w.created_by IS NOT NULL
                """
            )
        except Exception:
            pass


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('automation_flows')]
    if 'created_by' in columns:
        try:
            op.drop_index(op.f('ix_automation_flows_created_by'), table_name='automation_flows')
        except Exception:
            pass
        op.drop_column('automation_flows', 'created_by')
