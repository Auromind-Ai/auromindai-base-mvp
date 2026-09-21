"""Persist email report filters and CSV column selection.

Revision ID: a8c4e2b6d901
Revises: f1a2b3c4d5e6
"""
from alembic import op
import sqlalchemy as sa

revision = "a8c4e2b6d901"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    if "lead_report_settings" not in inspector.get_table_names():
        op.create_table(
            "lead_report_settings",
            sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("min_score", sa.Integer(), nullable=False),
            sa.Column("frequency", sa.String(20), nullable=False),
            sa.Column("send_time", sa.String(10), nullable=False),
            sa.Column("recipient_emails", sa.JSON(), nullable=False),
            sa.Column("attach_csv", sa.Boolean(), nullable=False),
            sa.Column("subject_template", sa.String(255)),
            sa.Column("body_template", sa.Text()),
            sa.Column("last_sent_at", sa.DateTime(timezone=True)),
            sa.Column("next_run_at", sa.DateTime(timezone=True), index=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True)),
            sa.Column("report_filters", sa.JSON()),
            sa.Column("csv_columns", sa.JSON()),
        )
        return
    columns = {column["name"] for column in inspector.get_columns("lead_report_settings")}
    for name in ("report_filters", "csv_columns"):
        if name not in columns:
            op.add_column("lead_report_settings", sa.Column(name, sa.JSON(), nullable=True))


def downgrade():
    for name in ("csv_columns", "report_filters"):
        op.drop_column("lead_report_settings", name)
