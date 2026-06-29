"""extend_token_ledger_provider_usage_columns

Revision ID: c1d2e3f4a5b6
Revises: b4c9e8a71d02
Create Date: 2026-06-25 18:00:00.000000

Adds 8 provider-usage columns to token_ledger so it becomes the single
source of truth for both spending-guard reservations and billing audit:

    provider        - AI provider name (groq, claude, gemini, openai …)
    model           - Exact model identifier returned by provider
    prompt_tokens   - Provider-reported input token count
    completion_tokens - Provider-reported output token count
    total_tokens    - Provider-reported total (prompt + completion)
    request_id      - Optional provider request/trace ID for debugging
    execution_id    - AIExecutionService execution UUID
    feature_key     - Billing feature key (ai_chat, flow_generation …)

All columns are nullable so that existing rows (token grants, purchases,
reservations) are unaffected by this migration.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'b4c9e8a71d02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add provider-usage columns to token_ledger
    op.add_column('token_ledger', sa.Column('provider', sa.String(50), nullable=True))
    op.add_column('token_ledger', sa.Column('model', sa.String(100), nullable=True))
    op.add_column('token_ledger', sa.Column('prompt_tokens', sa.Integer(), nullable=True))
    op.add_column('token_ledger', sa.Column('completion_tokens', sa.Integer(), nullable=True))
    op.add_column('token_ledger', sa.Column('total_tokens', sa.Integer(), nullable=True))
    op.add_column('token_ledger', sa.Column('request_id', sa.String(255), nullable=True))
    op.add_column('token_ledger', sa.Column('execution_id', sa.String(255), nullable=True))
    op.add_column('token_ledger', sa.Column('feature_key', sa.String(100), nullable=True))

    # Indexes for analytics queries: "show all executions for feature X"
    op.create_index(
        'ix_token_ledger_execution_id',
        'token_ledger',
        ['execution_id'],
        unique=False,
    )
    op.create_index(
        'ix_token_ledger_feature_key',
        'token_ledger',
        ['feature_key'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_token_ledger_feature_key', table_name='token_ledger')
    op.drop_index('ix_token_ledger_execution_id', table_name='token_ledger')

    op.drop_column('token_ledger', 'feature_key')
    op.drop_column('token_ledger', 'execution_id')
    op.drop_column('token_ledger', 'request_id')
    op.drop_column('token_ledger', 'total_tokens')
    op.drop_column('token_ledger', 'completion_tokens')
    op.drop_column('token_ledger', 'prompt_tokens')
    op.drop_column('token_ledger', 'model')
    op.drop_column('token_ledger', 'provider')
