"""create_ai_agents_table

Revision ID: c9b25ad5a2e5
Revises: 01099662b662
Create Date: 2026-10-26 06:41:54.661124

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c9b25ad5a2e5'
down_revision: Union[str, Sequence[str], None] = '01099662b662'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "ai_agents" not in tables:
        op.create_table(
            "ai_agents",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "workspace_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
                nullable=False
            ),
            sa.Column(
                "created_by",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True
            ),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("agent_type", sa.String(length=100), nullable=False, server_default="sales_assistant"),
            sa.Column("avatar_url", sa.String(length=500), nullable=True),
            sa.Column("language", sa.String(length=100), nullable=False, server_default="English (India)"),
            sa.Column("tone_of_voice", sa.String(length=100), nullable=False, server_default="Friendly & Professional"),
            sa.Column("business_name", sa.String(length=255), nullable=True),
            sa.Column("website_url", sa.String(length=500), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="active"),
            sa.Column("is_draft", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("channels_config", sa.JSON(), nullable=False, server_default="{}"),
            sa.Column("channel_settings", sa.JSON(), nullable=False, server_default="{}"),
            sa.Column("ai_config", sa.JSON(), nullable=False, server_default="{}"),
            sa.Column("knowledge_config", sa.JSON(), nullable=False, server_default="{}"),
            sa.Column("conversations_count", sa.JSON(), nullable=True, server_default="{}"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now(), nullable=True),
        )
        op.create_index("ix_ai_agents_workspace_id", "ai_agents", ["workspace_id"])
        op.create_index("ix_ai_agents_created_by", "ai_agents", ["created_by"])
        op.create_index("ix_ai_agents_name", "ai_agents", ["name"])
        op.create_index("ix_ai_agents_status", "ai_agents", ["status"])
        op.create_index("ix_ai_agents_is_draft", "ai_agents", ["is_draft"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "ai_agents" in tables:
        op.drop_index("ix_ai_agents_is_draft", table_name="ai_agents")
        op.drop_index("ix_ai_agents_status", table_name="ai_agents")
        op.drop_index("ix_ai_agents_name", table_name="ai_agents")
        op.drop_index("ix_ai_agents_created_by", table_name="ai_agents")
        op.drop_index("ix_ai_agents_workspace_id", table_name="ai_agents")
        op.drop_table("ai_agents")
