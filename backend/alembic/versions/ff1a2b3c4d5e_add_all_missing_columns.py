"""add all missing model columns

Revision ID: ff1a2b3c4d5e
Revises: b2c3d4e5f6a8, ebd56dc264a2
Create Date: 2026-04-28 07:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ff1a2b3c4d5e'
down_revision: Union[str, Sequence[str], None] = ('b2c3d4e5f6a8', 'ebd56dc264a2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns(conn, table):
    """Return set of column names that already exist for the given table."""
    return {col['name'] for col in sa.inspect(conn).get_columns(table)}


def upgrade() -> None:
    conn = op.get_bind()

    # ── conversations ────────────────────────────────────────────────────────
    cols = _existing_columns(conn, 'conversations')
    if 'metadata_json' not in cols:
        op.add_column('conversations', sa.Column('metadata_json', sa.Text(), nullable=True))
    if 'contact_name' not in cols:
        op.add_column('conversations', sa.Column('contact_name', sa.String(), nullable=True))
    if 'profile_pic' not in cols:
        op.add_column('conversations', sa.Column('profile_pic', sa.Text(), nullable=True))
    if 'external_id' not in cols:
        op.add_column('conversations', sa.Column('external_id', sa.String(), nullable=True))

    # ── chat_messages ────────────────────────────────────────────────────────
    cols = _existing_columns(conn, 'chat_messages')
    if 'metadata_json' not in cols:
        op.add_column('chat_messages', sa.Column('metadata_json', sa.Text(), nullable=True))

    # ── messages (inbox messages) ─────────────────────────────────────────────
    if sa.inspect(conn).has_table('messages'):
        cols = _existing_columns(conn, 'messages')
        if 'metadata_json' not in cols:
            op.add_column('messages', sa.Column('metadata_json', sa.Text(), nullable=True))

    # ── token_ledger ──────────────────────────────────────────────────────────
    if sa.inspect(conn).has_table('token_ledger'):
        cols = _existing_columns(conn, 'token_ledger')
        if 'metadata_json' not in cols:
            op.add_column('token_ledger', sa.Column('metadata_json', sa.Text(), nullable=True))
        if 'expires_at' not in cols:
            op.add_column('token_ledger', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))

    # ── credit_ledger ─────────────────────────────────────────────────────────
    if sa.inspect(conn).has_table('credit_ledger'):
        cols = _existing_columns(conn, 'credit_ledger')
        if 'metadata_json' not in cols:
            op.add_column('credit_ledger', sa.Column('metadata_json', sa.Text(), nullable=True))
        if 'expires_at' not in cols:
            op.add_column('credit_ledger', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))

    # ── workspaces (extra safety net) ─────────────────────────────────────────
    cols = _existing_columns(conn, 'workspaces')
    if 'billing_owner_id' not in cols:
        op.add_column('workspaces', sa.Column('billing_owner_id', postgresql.UUID(as_uuid=True), nullable=True))
    if 'provider_customer_id' not in cols:
        op.add_column('workspaces', sa.Column('provider_customer_id', sa.Text(), nullable=True))


def downgrade() -> None:
    # These columns are all nullable additions — safe to drop on rollback.
    conn = op.get_bind()

    cols = _existing_columns(conn, 'conversations')
    for col in ('metadata_json', 'contact_name', 'profile_pic', 'external_id'):
        if col in cols:
            op.drop_column('conversations', col)

    cols = _existing_columns(conn, 'chat_messages')
    if 'metadata_json' in cols:
        op.drop_column('chat_messages', 'metadata_json')
