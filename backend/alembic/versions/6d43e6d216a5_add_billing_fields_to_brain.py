"""add_billing_fields_to_brain

Revision ID: 6d43e6d216a5
Revises: 6d072d5f00f1
Create Date: 2026-06-22 11:52:03.161341

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6d43e6d216a5'
down_revision: Union[str, Sequence[str], None] = '6d072d5f00f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('brain', sa.Column('file_name', sa.String(length=255), nullable=True))
    op.add_column('brain', sa.Column('file_size', sa.Integer(), nullable=True))
    op.add_column('brain', sa.Column('credits_charged', sa.Float(), nullable=True))
    op.add_column('brain', sa.Column('embedding_status', sa.String(length=50), nullable=True))

    # Update knowledge_base_upload credit cost to 1.0000
    op.execute(
        "UPDATE feature_billing_rules SET credit_cost = 1.0000 WHERE feature_key = 'knowledge_base_upload'"
    )



def downgrade() -> None:
    """Downgrade schema."""
    # Revert knowledge_base_upload credit cost to 0.5000
    op.execute(
        "UPDATE feature_billing_rules SET credit_cost = 0.5000 WHERE feature_key = 'knowledge_base_upload'"
    )

    op.drop_column('brain', 'embedding_status')
    op.drop_column('brain', 'credits_charged')
    op.drop_column('brain', 'file_size')
    op.drop_column('brain', 'file_name')

