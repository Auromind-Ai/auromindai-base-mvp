"""add missing billing columns

Revision ID: ef7a8b9c0e2d
Revises: bfb5103dad12
Create Date: 2026-04-01 17:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ef7a8b9c0e2d'
down_revision: Union[str, Sequence[str], None] = 'bfb5103dad12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Check if columns already exist (since we manually added them)
    # Using raw SQL check for postgres
    conn = op.get_bind()
    columns = [col['name'] for col in sa.inspect(conn).get_columns('workspaces')]
    
    if 'billing_owner_id' not in columns:
        op.add_column('workspaces', sa.Column('billing_owner_id', postgresql.UUID(as_uuid=True), nullable=True))
    if 'provider_customer_id' not in columns:
        op.add_column('workspaces', sa.Column('provider_customer_id', sa.Text(), nullable=True))

def downgrade() -> None:
    op.drop_column('workspaces', 'provider_customer_id')
    op.drop_column('workspaces', 'billing_owner_id')
