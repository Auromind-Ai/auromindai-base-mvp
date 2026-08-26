"""add user feedback table

Revision ID: ae40a3e8c31e
Revises: 575b65956f82
Create Date: 2026-08-13 07:51:52.562002

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ae40a3e8c31e'
down_revision: Union[str, Sequence[str], None] = '575b65956f82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'user_feedback' not in tables:
        op.create_table(
            'user_feedback',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('workspace_id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('category', sa.String(), nullable=False),
            sa.Column('rating', sa.Integer(), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column(
                'created_at',
                sa.DateTime(),
                server_default=sa.text('now()'),
                nullable=True
            ),
            sa.ForeignKeyConstraint(
                ['workspace_id'],
                ['workspaces.id'],
                ondelete='CASCADE'
            ),
            sa.PrimaryKeyConstraint('id')
        )

    inspector = sa.inspect(bind)
    if 'user_feedback' in inspector.get_table_names():
        indexes = [ix['name'] for ix in inspector.get_indexes('user_feedback')]
        if 'ix_user_feedback_user_id' not in indexes:
            try:
                op.create_index(
                    'ix_user_feedback_user_id',
                    'user_feedback',
                    ['user_id'],
                    unique=False
                )
            except Exception:
                pass

        if 'ix_user_feedback_workspace_id' not in indexes:
            try:
                op.create_index(
                    'ix_user_feedback_workspace_id',
                    'user_feedback',
                    ['workspace_id'],
                    unique=False
                )
            except Exception:
                pass


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'user_feedback' in inspector.get_table_names():
        indexes = [ix['name'] for ix in inspector.get_indexes('user_feedback')]
        if 'ix_user_feedback_workspace_id' in indexes:
            try:
                op.drop_index('ix_user_feedback_workspace_id', table_name='user_feedback')
            except Exception:
                pass
        if 'ix_user_feedback_user_id' in indexes:
            try:
                op.drop_index('ix_user_feedback_user_id', table_name='user_feedback')
            except Exception:
                pass
        op.drop_table('user_feedback')