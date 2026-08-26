"""add user_feedbacks table

Revision ID: m1n2o3p4q5r6
Revises: k8l9m0n1o2p3
Create Date: 2026-08-14 19:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'm1n2o3p4q5r6'
down_revision = 'k8l9m0n1o2p3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'user_feedback' not in tables:
        op.create_table(
            'user_feedback',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column('workspace_id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('category', sa.String(length=100), nullable=False, server_default='General'),
            sa.Column('rating', sa.Integer(), nullable=False, server_default='5'),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        )

    inspector = sa.inspect(bind)
    if 'user_feedback' in inspector.get_table_names():
        indexes = [ix['name'] for ix in inspector.get_indexes('user_feedback')]
        if 'ix_user_feedback_workspace_id' not in indexes:
            try:
                op.create_index(op.f('ix_user_feedback_workspace_id'), 'user_feedback', ['workspace_id'], unique=False)
            except Exception:
                pass
        if 'ix_user_feedback_user_id' not in indexes:
            try:
                op.create_index(op.f('ix_user_feedback_user_id'), 'user_feedback', ['user_id'], unique=False)
            except Exception:
                pass


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'user_feedback' in inspector.get_table_names():
        indexes = [ix['name'] for ix in inspector.get_indexes('user_feedback')]
        if 'ix_user_feedback_user_id' in indexes:
            try:
                op.drop_index(op.f('ix_user_feedback_user_id'), table_name='user_feedback')
            except Exception:
                pass
        if 'ix_user_feedback_workspace_id' in indexes:
            try:
                op.drop_index(op.f('ix_user_feedback_workspace_id'), table_name='user_feedback')
            except Exception:
                pass
        op.drop_table('user_feedback')
