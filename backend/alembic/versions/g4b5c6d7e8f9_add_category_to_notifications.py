"""add_category_to_notifications

Revision ID: g4b5c6d7e8f9
Revises: f3a4b5c6d7e8
Create Date: 2026-09-04 10:30:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'g4b5c6d7e8f9'
down_revision = 'f3a4b5c6d7e8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'notifications',
        sa.Column('category', sa.String(length=50), server_default='system', nullable=True)
    )
    op.create_index(
        op.f('ix_notifications_category'),
        'notifications',
        ['category'],
        unique=False
    )

    # Backfill existing rows
    op.execute("""
        UPDATE notifications
        SET category = 'mentions'
        WHERE type IN (
            'lead_alert', 'lead_assigned', 'lead_created', 'lead_converted',
            'mention', 'team_mention', 'task_assigned', 'conversation_assigned',
            'message_received', 'lead.created', 'lead.assigned'
        )
    """)

    op.execute("""
        UPDATE notifications
        SET category = 'updates'
        WHERE type IN (
            'product_update', 'ai_credits', 'workflow_completed', 'wallet_recharge',
            'credit_added', 'report_ready', 'feature_announcement', 'workflow.completed',
            'wallet.recharge'
        )
    """)

    op.execute("""
        UPDATE notifications
        SET category = 'system'
        WHERE category IS NULL
    """)


def downgrade():
    op.drop_index(op.f('ix_notifications_category'), table_name='notifications')
    op.drop_column('notifications', 'category')
