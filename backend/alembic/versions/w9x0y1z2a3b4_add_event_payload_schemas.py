"""add event_payload_schemas table

Revision ID: w9x0y1z2a3b4
Revises: v8w9x0y1z2a3
Create Date: 2026-08-19 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'w9x0y1z2a3b4'
down_revision = 'v8w9x0y1z2a3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'event_payload_schemas' not in existing_tables:
        op.create_table(
            'event_payload_schemas',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column('event_name', sa.String(length=100), nullable=False),
            sa.Column('template_key', sa.String(length=100), nullable=True),
            sa.Column('category', sa.String(length=50), nullable=True),
            sa.Column('discovered_keys', sa.JSON(), nullable=False, server_default='[]'),
            sa.Column('sample_payload', sa.JSON(), nullable=False, server_default='{}'),
            sa.Column('last_seen_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('event_name', name='uq_event_payload_schema_name')
        )
        op.create_index('ix_event_payload_schemas_name', 'event_payload_schemas', ['event_name'])
        op.create_index('ix_event_payload_schemas_template_key', 'event_payload_schemas', ['template_key'])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'event_payload_schemas' in existing_tables:
        op.drop_table('event_payload_schemas')
