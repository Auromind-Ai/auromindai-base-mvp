"""add_deletion_scheduled_at_to_users

Revision ID: 7273795b5903
Revises: ff642e245572
Create Date: 2026-06-16 07:12:25.324928

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7273795b5903'
down_revision: Union[str, Sequence[str], None] = 'ff642e245572'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    def column_exists(table, column):
        columns = [col['name'] for col in inspector.get_columns(table)]
        return column in columns

    if not column_exists('users', 'deletion_scheduled_at'):
        op.add_column('users', sa.Column('deletion_scheduled_at', sa.DateTime(timezone=True), nullable=True))

    if not column_exists('users', 'two_factor_enabled'):
        op.add_column('users', sa.Column('two_factor_enabled', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    else:
        op.alter_column('users', 'two_factor_enabled',
                   existing_type=sa.BOOLEAN(),
                   nullable=False,
                   existing_server_default=sa.text('false'))

    if not column_exists('users', 'two_factor_secret'):
        op.add_column('users', sa.Column('two_factor_secret', sa.String(), nullable=True))
    else:
        op.alter_column('users', 'two_factor_secret',
                   existing_type=sa.TEXT(),
                   type_=sa.String(),
                   existing_nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    def column_exists(table, column):
        columns = [col['name'] for col in inspector.get_columns(table)]
        return column in columns

    if column_exists('users', 'two_factor_secret'):
        op.drop_column('users', 'two_factor_secret')
    if column_exists('users', 'two_factor_enabled'):
        op.drop_column('users', 'two_factor_enabled')
    if column_exists('users', 'deletion_scheduled_at'):
        op.drop_column('users', 'deletion_scheduled_at')
