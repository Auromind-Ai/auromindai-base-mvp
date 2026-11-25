"""add locked_reason to workspace_members

Revision ID: 8d4f2a91c3e6
Revises: e7f8a9b0c1d2
Create Date: 2026-11-25 11:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8d4f2a91c3e6"
down_revision: Union[str, Sequence[str], None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("workspace_members")]
    if "locked_reason" not in columns:
        op.add_column(
            "workspace_members",
            sa.Column("locked_reason", sa.String(length=50), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("workspace_members")]
    if "locked_reason" in columns:
        op.drop_column("workspace_members", "locked_reason")
