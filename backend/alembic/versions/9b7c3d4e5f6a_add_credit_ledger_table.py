"""add credit ledger table

Revision ID: 9b7c3d4e5f6a
Revises: d3e91e9bc870
Create Date: 2026-03-30 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "9b7c3d4e5f6a"
down_revision = "d3e91e9bc870"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "credit_ledger",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("entry_type", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("credits_delta", sa.Integer(), nullable=False),
        sa.Column("reference_key", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reference_key", name="uq_credit_ledger_reference_key"),
    )
    op.create_index(op.f("ix_credit_ledger_payment_id"), "credit_ledger", ["payment_id"], unique=False)
    op.create_index(op.f("ix_credit_ledger_reference_key"), "credit_ledger", ["reference_key"], unique=False)
    op.create_index(op.f("ix_credit_ledger_subscription_id"), "credit_ledger", ["subscription_id"], unique=False)
    op.create_index(op.f("ix_credit_ledger_workspace_id"), "credit_ledger", ["workspace_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_credit_ledger_workspace_id"), table_name="credit_ledger")
    op.drop_index(op.f("ix_credit_ledger_subscription_id"), table_name="credit_ledger")
    op.drop_index(op.f("ix_credit_ledger_reference_key"), table_name="credit_ledger")
    op.drop_index(op.f("ix_credit_ledger_payment_id"), table_name="credit_ledger")
    op.drop_table("credit_ledger")
