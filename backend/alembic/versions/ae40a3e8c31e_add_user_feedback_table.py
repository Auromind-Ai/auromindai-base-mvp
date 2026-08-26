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

    op.create_index(
        'ix_user_feedback_user_id',
        'user_feedback',
        ['user_id'],
        unique=False
    )

    op.create_index(
        'ix_user_feedback_workspace_id',
        'user_feedback',
        ['workspace_id'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index(
        'ix_user_feedback_workspace_id',
        table_name='user_feedback'
    )

    op.drop_index(
        'ix_user_feedback_user_id',
        table_name='user_feedback'
    )

    op.drop_table('user_feedback')