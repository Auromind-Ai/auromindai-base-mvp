"""add_flow_packs_table

Revision ID: b4c9e8a71d02
Revises: af9610eb4fa4
Create Date: 2026-06-25 12:00:00.000000

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import table, column

# revision identifiers, used by Alembic.
revision: str = 'b4c9e8a71d02'
down_revision: Union[str, Sequence[str], None] = 'af9610eb4fa4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing tables if they exist
    op.execute("DROP TABLE IF EXISTS flow_pack_purchases CASCADE;")
    op.execute("DROP TABLE IF EXISTS flow_packs CASCADE;")
    op.execute("DROP TABLE IF EXISTS purchased_flow_packs CASCADE;")

    # 1. Create flow_packs table
    op.create_table('flow_packs',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('pack_id', sa.String(length=50), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.String(length=255), nullable=True),
    sa.Column('flows_count', sa.Integer(), nullable=False),
    sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('currency', sa.String(length=10), server_default='INR', nullable=False),
    sa.Column('provider', sa.String(length=50), server_default='razorpay', nullable=False),
    sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('display_order', sa.Integer(), server_default='0', nullable=False),
    sa.Column('badge', sa.String(length=50), nullable=True),
    sa.Column('extra_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_flow_packs_pack_id'), 'flow_packs', ['pack_id'], unique=True)

    # 2. Create flow_pack_purchases table
    op.create_table('flow_pack_purchases',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('workspace_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=True),
    sa.Column('flow_pack_id', sa.UUID(), nullable=False),
    sa.Column('flows_count', sa.Integer(), nullable=False),
    sa.Column('amount_paid', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('currency', sa.String(length=10), server_default='INR', nullable=False),
    sa.Column('provider', sa.String(length=50), server_default='razorpay', nullable=False),
    sa.Column('gateway_order_id', sa.String(length=100), nullable=False),
    sa.Column('gateway_payment_id', sa.String(length=100), nullable=True),
    sa.Column('gateway_signature', sa.String(length=255), nullable=True),
    sa.Column('status', sa.String(length=50), server_default='initiated', nullable=False),
    sa.Column('failure_reason', sa.String(length=255), nullable=True),
    sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['flow_pack_id'], ['flow_packs.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_flow_pack_purchases_workspace_id'), 'flow_pack_purchases', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_flow_pack_purchases_user_id'), 'flow_pack_purchases', ['user_id'], unique=False)
    op.create_index(op.f('ix_flow_pack_purchases_flow_pack_id'), 'flow_pack_purchases', ['flow_pack_id'], unique=False)
    op.create_index(op.f('ix_flow_pack_purchases_gateway_order_id'), 'flow_pack_purchases', ['gateway_order_id'], unique=True)
    op.create_index(op.f('ix_flow_pack_purchases_gateway_payment_id'), 'flow_pack_purchases', ['gateway_payment_id'], unique=False)
    op.create_index(op.f('ix_flow_pack_purchases_status'), 'flow_pack_purchases', ['status'], unique=False)

    # 3. Seed default flow packs: starter, growth, business
    flow_packs_table = table('flow_packs',
        column('id', sa.UUID()),
        column('pack_id', sa.String()),
        column('name', sa.String()),
        column('description', sa.String()),
        column('flows_count', sa.Integer()),
        column('price', sa.Numeric()),
        column('currency', sa.String()),
        column('provider', sa.String()),
        column('is_active', sa.Boolean()),
        column('display_order', sa.Integer()),
        column('badge', sa.String()),
    )

    op.bulk_insert(flow_packs_table, [
        {
            'id': str(uuid.uuid4()),
            'pack_id': 'starter',
            'name': 'Starter Pack',
            'description': '5 additional AI flows',
            'flows_count': 5,
            'price': 999.00,
            'currency': 'INR',
            'provider': 'razorpay',
            'is_active': True,
            'display_order': 1,
            'badge': 'Popular'
        },
        {
            'id': str(uuid.uuid4()),
            'pack_id': 'growth',
            'name': 'Growth Pack',
            'description': '10 additional AI flows',
            'flows_count': 10,
            'price': 1799.00,
            'currency': 'INR',
            'provider': 'razorpay',
            'is_active': True,
            'display_order': 2,
            'badge': None
        },
        {
            'id': str(uuid.uuid4()),
            'pack_id': 'business',
            'name': 'Business Pack',
            'description': '25 additional AI flows',
            'flows_count': 25,
            'price': 3999.00,
            'currency': 'INR',
            'provider': 'razorpay',
            'is_active': True,
            'display_order': 3,
            'badge': 'Best Value'
        }
    ])


def downgrade() -> None:
    op.drop_index(op.f('ix_flow_pack_purchases_status'), table_name='flow_pack_purchases')
    op.drop_index(op.f('ix_flow_pack_purchases_gateway_payment_id'), table_name='flow_pack_purchases')
    op.drop_index(op.f('ix_flow_pack_purchases_gateway_order_id'), table_name='flow_pack_purchases')
    op.drop_index(op.f('ix_flow_pack_purchases_flow_pack_id'), table_name='flow_pack_purchases')
    op.drop_index(op.f('ix_flow_pack_purchases_user_id'), table_name='flow_pack_purchases')
    op.drop_index(op.f('ix_flow_pack_purchases_workspace_id'), table_name='flow_pack_purchases')
    op.drop_table('flow_pack_purchases')
    op.drop_index(op.f('ix_flow_packs_pack_id'), table_name='flow_packs')
    op.drop_table('flow_packs')
