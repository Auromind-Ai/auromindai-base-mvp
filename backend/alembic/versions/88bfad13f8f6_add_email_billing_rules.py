"""add_email_billing_rules

Revision ID: 88bfad13f8f6
Revises: ab9651d8f2a4
Create Date: 2026-06-23 13:36:02.239042

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '88bfad13f8f6'
down_revision: Union[str, Sequence[str], None] = 'ab9651d8f2a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    import uuid
    bind = op.get_bind()
    new_rules = [
        ("email_classification", "Email Classification", "TOKEN", 1000, 0.2000, "AI classification of email category"),
        ("email_summary", "Email Summary", "TOKEN", 1000, 0.5000, "AI generation of email summary"),
        ("email_entity_extraction", "Email Entity Extraction", "TOKEN", 1000, 0.5000, "AI extraction of structured entities from email"),
        ("email_processing", "Email AI Processing", "FLAT", 1, 3.2000, "Aggregated parent billing for background email AI processing"),
    ]
    for key, name, b_type, u_val, cost, desc in new_rules:
        exist_check = bind.execute(
            sa.text("SELECT id FROM feature_billing_rules WHERE feature_key = :key"),
            {"key": key}
        ).fetchone()

        if not exist_check:
            rule_id = str(uuid.uuid4())
            bind.execute(
                sa.text("""
                    INSERT INTO feature_billing_rules (
                        id, feature_key, feature_name, billing_type, 
                        unit_value, credit_cost, is_active, description
                    ) VALUES (
                        :id, :key, :name, :b_type,
                        :u_val, :cost, true, :desc
                    )
                """),
                {
                    "id": rule_id,
                    "key": key,
                    "name": name,
                    "b_type": b_type,
                    "u_val": u_val,
                    "cost": cost,
                    "desc": desc
                }
            )


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    bind.execute(
        sa.text("DELETE FROM feature_billing_rules WHERE feature_key IN ('email_classification', 'email_summary', 'email_entity_extraction', 'email_processing')")
    )

