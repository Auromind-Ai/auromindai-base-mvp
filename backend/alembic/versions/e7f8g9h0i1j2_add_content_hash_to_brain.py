"""add content_hash to brain table

Revision ID: e7f8g9h0i1j2
Revises: 08e673f229ae
Create Date: 2026-07-24 18:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e7f8g9h0i1j2'
down_revision: Union[str, None] = 'f9a8b7c6d5e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('brain')]
    if 'content_hash' not in columns:
        op.add_column('brain', sa.Column('content_hash', sa.String(length=64), nullable=True))
        op.create_index(op.f('ix_brain_content_hash'), 'brain', ['content_hash'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_brain_content_hash'), table_name='brain')
    op.drop_column('brain', 'content_hash')
