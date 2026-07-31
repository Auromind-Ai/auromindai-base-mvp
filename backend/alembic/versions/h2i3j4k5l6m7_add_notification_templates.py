"""add notification_templates table

Revision ID: h2i3j4k5l6m7
Revises: 08e673f229ae
Create Date: 2026-07-23 18:45:00.000000

"""
from alembic import op
import sqlalchemy as sb
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'h2i3j4k5l6m7'
down_revision = '08e673f229ae'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'notification_templates',
        sb.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sb.Column('category', sb.String(length=50), nullable=False),
        sb.Column('template_key', sb.String(length=100), nullable=False),
        sb.Column('name', sb.String(length=255), nullable=False),
        sb.Column('title', sb.String(length=255), nullable=True),
        sb.Column('subject', sb.String(length=255), nullable=True),
        sb.Column('message', sb.Text(), nullable=False),
        sb.Column('channel', sb.String(length=50), nullable=False, server_default='in_app'),
        sb.Column('is_active', sb.Boolean(), nullable=False, server_default='true'),
        sb.Column('created_at', sb.DateTime(timezone=True), server_default=sb.text('now()'), nullable=False),
        sb.Column('updated_at', sb.DateTime(timezone=True), server_default=sb.text('now()'), nullable=False),
        sb.Column('updated_by', sb.String(length=255), nullable=True),
        sb.UniqueConstraint('template_key', 'channel', name='uix_notif_template_key_channel')
    )
    op.create_index(op.f('ix_notification_templates_category'), 'notification_templates', ['category'], unique=False)
    op.create_index(op.f('ix_notification_templates_template_key'), 'notification_templates', ['template_key'], unique=False)
    op.create_index(op.f('ix_notification_templates_channel'), 'notification_templates', ['channel'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notification_templates_channel'), table_name='notification_templates')
    op.drop_index(op.f('ix_notification_templates_template_key'), table_name='notification_templates')
    op.drop_index(op.f('ix_notification_templates_category'), table_name='notification_templates')
    op.drop_table('notification_templates')
