"""create status page tables

Revision ID: e7f8a9b0c1d2
Revises: c9b25ad5a2e5, d1e2f3a4b5c6
Create Date: 2026-11-03 11:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e7f8a9b0c1d2'
down_revision: Union[str, Sequence[str], None] = ('c9b25ad5a2e5', 'd1e2f3a4b5c6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. service_health_checks
    if "service_health_checks" not in tables:
        op.create_table(
            "service_health_checks",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("service_key", sa.String(50), nullable=False, index=True),
            sa.Column("service_name", sa.String(100), nullable=False),
            sa.Column("is_healthy", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("status_code", sa.Integer(), nullable=True),
            sa.Column("response_time_ms", sa.Float(), nullable=False, server_default=sa.text("0.0")),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("details", sa.JSON(), nullable=True),
            sa.Column("checked_at", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        )

    # 2. service_daily_uptimes
    if "service_daily_uptimes" not in tables:
        op.create_table(
            "service_daily_uptimes",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("service_key", sa.String(50), nullable=False, index=True),
            sa.Column("date", sa.String(10), nullable=False, index=True),
            sa.Column("total_checks", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("successful_checks", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("uptime_percentage", sa.Float(), nullable=False, server_default=sa.text("100.0")),
            sa.Column("avg_response_time_ms", sa.Float(), nullable=False, server_default=sa.text("0.0")),
            sa.Column("has_incident", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("incident_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("service_key", "date", name="uq_service_daily_uptime_key_date"),
        )

    # 3. incidents
    if "incidents" not in tables:
        op.create_table(
            "incidents",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("service_key", sa.String(50), nullable=False, index=True),
            sa.Column("service_name", sa.String(100), nullable=False),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("severity", sa.String(20), nullable=False, server_default=sa.text("'major'")),
            sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'investigating'")),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("start_time", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
            sa.Column("resolved_time", sa.DateTime(timezone=True), nullable=True),
            sa.Column("duration_minutes", sa.Integer(), nullable=True),
            sa.Column("is_auto_detected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("is_maintenance", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=True),
            sa.Column("scheduled_end", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 4. incident_updates
    if "incident_updates" not in tables:
        op.create_table(
            "incident_updates",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("status", sa.String(20), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 5. status_subscribers
    if "status_subscribers" not in tables:
        op.create_table(
            "status_subscribers",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 6. status_page_config
    if "status_page_config" not in tables:
        op.create_table(
            "status_page_config",
            sa.Column("id", sa.Integer(), primary_key=True, default=1),
            sa.Column("failure_threshold", sa.Integer(), nullable=False, server_default=sa.text("3")),
            sa.Column("recovery_threshold", sa.Integer(), nullable=False, server_default=sa.text("2")),
            sa.Column("check_interval_seconds", sa.Integer(), nullable=False, server_default=sa.text("60")),
            sa.Column("timeout_seconds", sa.Integer(), nullable=False, server_default=sa.text("10")),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    for tbl in [
        "incident_updates",
        "incidents",
        "service_daily_uptimes",
        "service_health_checks",
        "status_subscribers",
        "status_page_config",
    ]:
        if tbl in tables:
            op.drop_table(tbl)
