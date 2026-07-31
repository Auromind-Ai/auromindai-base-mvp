"""add_prefix_to_invoice_sequence

Revision ID: 575b65956f82
Revises: 8c3cf45c6c75
Create Date: 2026-07-30 08:42:20.839891

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '575b65956f82'
down_revision: Union[str, Sequence[str], None] = '8c3cf45c6c75'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add prefix column as nullable first
    op.add_column('invoice_sequences', sa.Column('prefix', sa.String(length=50), nullable=True))
    
    # 2. Populate existing rows with default prefix
    op.execute("UPDATE invoice_sequences SET prefix = 'AUR' WHERE prefix IS NULL")
    
    # 3. Make prefix non-nullable
    op.alter_column('invoice_sequences', 'prefix', nullable=False, existing_type=sa.String(length=50))
    
    # 4. Re-create primary key as composite (prefix, year)
    op.drop_constraint('invoice_sequences_pkey', 'invoice_sequences', type_='primary')
    op.create_primary_key('invoice_sequences_pkey', 'invoice_sequences', ['prefix', 'year'])


def downgrade() -> None:
    op.drop_constraint('invoice_sequences_pkey', 'invoice_sequences', type_='primary')
    op.create_primary_key('invoice_sequences_pkey', 'invoice_sequences', ['year'])
    op.drop_column('invoice_sequences', 'prefix')
