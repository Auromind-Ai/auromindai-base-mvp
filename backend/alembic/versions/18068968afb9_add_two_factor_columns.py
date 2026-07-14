"""add two factor columns

Revision ID: 18068968afb9
Revises: b457c7d1b080
Create Date: 2026-07-06 12:01:52.160457

"""
from typing import Sequence, Union

from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = '18068968afb9'
down_revision: Union[str, Sequence[str], None] = 'b457c7d1b080'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    NOTE: This migration was auto-generated and originally contained duplicate
    operations already handled by earlier migrations:
      - flow_packs / flow_pack_purchases tables  -> b4c9e8a71d02
      - token_ledger provider-usage columns       -> c1d2e3f4a5b6
      - model_configs feature_key / experience    -> d3e4f5a6b7c8
      - model_configs fallback columns            -> b457c7d1b080
    The remaining operations (plan_entitlements.flow, wcc_rate_cards.*,
    wcc_transactions.*) were also already present in the database.
    This migration is now a no-op — it exists only to advance the
    alembic_version pointer.
    """
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass


