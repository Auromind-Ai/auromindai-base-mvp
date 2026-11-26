"""sync monthly_conversations into plan_entitlements feature_flags

Revision ID: f2c4d6e8a0b1
Revises: c4e8a1b9d207
Create Date: 2026-11-26 16:15:00.000000

"""
from typing import Sequence, Union
import json
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f2c4d6e8a0b1"
down_revision: Union[str, Sequence[str], None] = "c4e8a1b9d207"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PLAN_MONTHLY_CONVERSATIONS = {
    "free": 1000,
    "creator": 10000,
    "starter": 10000,
    "growth": 100000,
    "business": 1000000,
    "enterprise": -1,
    "pro": 100000,
}


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.text("""
            SELECT pe.id, lower(p.name) AS plan_name, pe.feature_flags
            FROM plan_entitlements pe
            JOIN plans p ON p.id = pe.plan_id
        """)
    ).fetchall()

    for ent_id, plan_name, raw_flags in rows:
        target_val = PLAN_MONTHLY_CONVERSATIONS.get(plan_name)
        if target_val is None:
            continue

        if isinstance(raw_flags, str):
            try:
                flags = json.loads(raw_flags) or {}
            except Exception:
                flags = {}
        elif isinstance(raw_flags, dict):
            flags = dict(raw_flags)
        else:
            flags = {}

        if "monthly_conversations" not in flags or flags["monthly_conversations"] is None or isinstance(flags["monthly_conversations"], bool):
            flags["monthly_conversations"] = target_val
            bind.execute(
                sa.text("UPDATE plan_entitlements SET feature_flags = :flags WHERE id = :id"),
                {"flags": json.dumps(flags), "id": ent_id},
            )


def downgrade() -> None:
    # Preserve admin/entitlement configuration on downgrade.
    pass
