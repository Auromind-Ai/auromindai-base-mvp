"""add_extended_billing_profile_fields

Revision ID: k8l9m0n1o2p3
Revises: 8c3cf45c6c75
Create Date: 2026-07-31 15:16:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'k8l9m0n1o2p3'
down_revision = '8c3cf45c6c75'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('workspaces', sa.Column('billing_city', sa.String(length=100), nullable=True))
    op.add_column('workspaces', sa.Column('billing_postal_code', sa.String(length=20), nullable=True))
    op.add_column('workspaces', sa.Column('billing_contact_name', sa.String(length=255), nullable=True))
    op.add_column('workspaces', sa.Column('billing_email', sa.String(length=255), nullable=True))
    op.add_column('workspaces', sa.Column('billing_phone', sa.String(length=50), nullable=True))
    op.add_column('workspaces', sa.Column('has_gst_registration', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('workspaces', sa.Column('legal_business_name', sa.String(length=255), nullable=True))
    op.add_column('workspaces', sa.Column('business_type', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('workspaces', 'business_type')
    op.drop_column('workspaces', 'legal_business_name')
    op.drop_column('workspaces', 'has_gst_registration')
    op.drop_column('workspaces', 'billing_phone')
    op.drop_column('workspaces', 'billing_email')
    op.drop_column('workspaces', 'billing_contact_name')
    op.drop_column('workspaces', 'billing_postal_code')
    op.drop_column('workspaces', 'billing_city')
