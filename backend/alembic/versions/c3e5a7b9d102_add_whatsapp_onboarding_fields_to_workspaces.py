"""add_whatsapp_onboarding_fields_to_workspaces

Revision ID: c3e5a7b9d102
Revises: 94eadb0e1587
Create Date: 2026-10-14 17:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3e5a7b9d102'
down_revision: Union[str, Sequence[str], None] = '94eadb0e1587'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('workspaces')]
    
    if 'meta_2fa_enabled' not in columns:
        op.add_column('workspaces', sa.Column('meta_2fa_enabled', sa.Boolean(), server_default='false', nullable=False))
    if 'meta_business_verification_status' not in columns:
        op.add_column('workspaces', sa.Column('meta_business_verification_status', sa.String(50), server_default='not_verified', nullable=False))
    if 'meta_onboarding_completed_at' not in columns:
        op.add_column('workspaces', sa.Column('meta_onboarding_completed_at', sa.DateTime(timezone=True), nullable=True))
    if 'meta_onboarding_dismissed' not in columns:
        op.add_column('workspaces', sa.Column('meta_onboarding_dismissed', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('workspaces')]
    
    if 'meta_onboarding_dismissed' in columns:
        op.drop_column('workspaces', 'meta_onboarding_dismissed')
    if 'meta_onboarding_completed_at' in columns:
        op.drop_column('workspaces', 'meta_onboarding_completed_at')
    if 'meta_business_verification_status' in columns:
        op.drop_column('workspaces', 'meta_business_verification_status')
    if 'meta_2fa_enabled' in columns:
        op.drop_column('workspaces', 'meta_2fa_enabled')
