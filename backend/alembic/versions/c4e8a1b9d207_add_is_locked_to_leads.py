"""add is_locked to leads

Revision ID: c4e8a1b9d207
Revises: 8d4f2a91c3e6
Create Date: 2026-11-25 12:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4e8a1b9d207"
down_revision: Union[str, Sequence[str], None] = "8d4f2a91c3e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("leads")]
    if "is_locked" not in columns:
        op.add_column(
            "leads",
            sa.Column(
                "is_locked",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("leads")]
    if "is_locked" in columns:
        op.drop_column("leads", "is_locked")
