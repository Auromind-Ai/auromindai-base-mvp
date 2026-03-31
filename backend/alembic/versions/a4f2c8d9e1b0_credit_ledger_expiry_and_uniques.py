"""add credit ledger expiry and provider uniqueness fixes

Revision ID: a4f2c8d9e1b0
Revises: 9b7c3d4e5f6a
Create Date: 2026-03-30 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "a4f2c8d9e1b0"
down_revision = "9b7c3d4e5f6a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "credit_ledger",
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_credit_ledger_expires_at",
        "credit_ledger",
        ["expires_at"],
        unique=False,
    )

    op.drop_constraint("webhook_events_provider_event_id_key", "webhook_events", type_="unique")

    op.create_index(
        "ix_workspaces_provider_customer_id",
        "workspaces",
        ["provider_customer_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_workspaces_provider_customer_id", table_name="workspaces")
    op.create_unique_constraint(
        "webhook_events_provider_event_id_key",
        "webhook_events",
        ["provider_event_id"],
    )
    op.drop_index("ix_credit_ledger_expires_at", table_name="credit_ledger")
    op.drop_column("credit_ledger", "expires_at")
