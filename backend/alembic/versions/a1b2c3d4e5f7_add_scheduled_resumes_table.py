"""add scheduled_resumes table

Revision ID: a1b2c3d4e5f7
Revises: f8a2b3c4d5e6
Create Date: 2026-04-24 16:45:00.000000

DB-backed delay scheduling for flow nodes with long waits (>30 min).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, Sequence[str], None] = 'f8a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scheduled_resumes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "conversation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("node_id", sa.String(), nullable=False),
        sa.Column("inbound_text", sa.String(), nullable=False, server_default=""),
        sa.Column("msg_sequence_val", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("run_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_scheduled_resumes_pending_run_at",
        "scheduled_resumes",
        ["status", "run_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_scheduled_resumes_pending_run_at", table_name="scheduled_resumes")
    op.drop_table("scheduled_resumes")