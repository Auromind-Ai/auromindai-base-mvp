"""update_template_feature_name

Revision ID: l9m0n1o2p3q4
Revises: 08e673f229ae
Create Date: 2026-08-04 16:08:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'l9m0n1o2p3q4'
down_revision: Union[str, Sequence[str], None] = '08e673f229ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update feature_name for template key to WhatsApp Template."""
    bind = op.get_bind()
    bind.execute(sa.text(
        "UPDATE feature_billing_rules SET feature_name = 'WhatsApp Template' WHERE feature_key = 'template'"
    ))


def downgrade() -> None:
    """Revert feature_name for template key to Gmail Template."""
    bind = op.get_bind()
    bind.execute(sa.text(
        "UPDATE feature_billing_rules SET feature_name = 'Gmail Template' WHERE feature_key = 'template'"
    ))
