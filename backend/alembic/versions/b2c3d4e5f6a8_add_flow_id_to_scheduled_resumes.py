"""add flow_id to scheduled_resumes

Revision ID: b2c3d4e5f6a8
Revises: a1b2c3d4e5f7
Create Date: 2026-04-24 17:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'b2c3d4e5f6a8'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "scheduled_resumes",
        sa.Column("flow_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_scheduled_resumes_flow_id", "scheduled_resumes", ["flow_id"])


def downgrade() -> None:
    op.drop_index("ix_scheduled_resumes_flow_id", table_name="scheduled_resumes")
    op.drop_column("scheduled_resumes", "flow_id")
