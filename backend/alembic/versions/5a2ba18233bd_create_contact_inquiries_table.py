"""create contact_inquiries table

Revision ID: 5a2ba18233bd
Revises: db9e73db9308
Create Date: 2026-08-24 06:28:14.186138

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5a2ba18233bd'
down_revision: Union[str, Sequence[str], None] = 'db9e73db9308'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'contact_inquiries' not in tables:
        op.create_table(
            'contact_inquiries',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('phone', sa.String(length=50), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('company', sa.String(length=255), nullable=True),
            sa.Column('budget', sa.String(length=100), nullable=True),
            sa.Column('requirement', sa.Text(), nullable=False),
            sa.Column('status', sa.String(length=50), nullable=True, server_default='Pending'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )

    inspector = sa.inspect(bind)
    if 'contact_inquiries' in inspector.get_table_names():
        indexes = [ix['name'] for ix in inspector.get_indexes('contact_inquiries')]
        if 'ix_contact_inquiries_id' not in indexes:
            try:
                op.create_index(op.f('ix_contact_inquiries_id'), 'contact_inquiries', ['id'], unique=False)
            except Exception:
                pass


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'contact_inquiries' in inspector.get_table_names():
        indexes = [ix['name'] for ix in inspector.get_indexes('contact_inquiries')]
        if 'ix_contact_inquiries_id' in indexes:
            try:
                op.drop_index(op.f('ix_contact_inquiries_id'), table_name='contact_inquiries')
            except Exception:
                pass
        op.drop_table('contact_inquiries')