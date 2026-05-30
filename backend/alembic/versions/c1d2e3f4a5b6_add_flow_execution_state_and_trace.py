"""add flow execution state and trace tables

Revision ID: c1d2e3f4a5b6
Revises: ef7a8b9c0e2d
Create Date: 2026-04-09 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = "ef7a8b9c0e2d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "flow_execution_states",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("active_flow_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("current_node_id", sa.String(), nullable=True),
        sa.Column("context", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("pending_button", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("button_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("conversation_id"),
    )
    op.create_index("ix_flow_execution_states_conversation_id", "flow_execution_states", ["conversation_id"], unique=False)
    op.create_index("ix_flow_execution_states_active_flow_id", "flow_execution_states", ["active_flow_id"], unique=False)

    op.create_table(
        "flow_execution_traces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("flow_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("node_id", sa.String(), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="success"),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("tokens_in", sa.Integer(), nullable=True),
        sa.Column("tokens_out", sa.Integer(), nullable=True),
        sa.Column("total_tokens", sa.Integer(), nullable=True),
        sa.Column("cost", sa.Numeric(12, 6), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_flow_execution_traces_conversation_id", "flow_execution_traces", ["conversation_id"], unique=False)
    op.create_index("ix_flow_execution_traces_flow_id", "flow_execution_traces", ["flow_id"], unique=False)
    op.create_index("ix_flow_execution_traces_node_id", "flow_execution_traces", ["node_id"], unique=False)
    op.create_index("ix_flow_execution_traces_event_type", "flow_execution_traces", ["event_type"], unique=False)
    op.create_index("ix_flow_execution_traces_status", "flow_execution_traces", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_flow_execution_traces_status", table_name="flow_execution_traces")
    op.drop_index("ix_flow_execution_traces_event_type", table_name="flow_execution_traces")
    op.drop_index("ix_flow_execution_traces_node_id", table_name="flow_execution_traces")
    op.drop_index("ix_flow_execution_traces_flow_id", table_name="flow_execution_traces")
    op.drop_index("ix_flow_execution_traces_conversation_id", table_name="flow_execution_traces")
    op.drop_table("flow_execution_traces")

    op.drop_index("ix_flow_execution_states_active_flow_id", table_name="flow_execution_states")
    op.drop_index("ix_flow_execution_states_conversation_id", table_name="flow_execution_states")
    op.drop_table("flow_execution_states")
