"""tenant_state_isolation_cutover

Revision ID: 9f3c6d1a7b2e
Revises: 7758fe8aa2cb
Create Date: 2026-05-19 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9f3c6d1a7b2e"
down_revision: Union[str, Sequence[str], None] = "7758fe8aa2cb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _archive_table(source_table: str, archive_table: str) -> None:
    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {archive_table}
        AS TABLE {source_table} WITH NO DATA
        """
    )
    op.execute(
        f"""
        INSERT INTO {archive_table}
        SELECT * FROM {source_table}
        """
    )
    op.execute(f"DELETE FROM {source_table}")


def _archive_rows(source_table: str, archive_table: str, where_clause: str) -> None:
    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {archive_table}
        AS TABLE {source_table} WITH NO DATA
        """
    )
    op.execute(
        f"""
        INSERT INTO {archive_table}
        SELECT * FROM {source_table}
        WHERE {where_clause}
        """
    )
    op.execute(f"DELETE FROM {source_table} WHERE {where_clause}")


def _conversation_mapping_cte() -> str:
    return """
    WITH single_user_conversations AS (
        SELECT user_id
        FROM conversations
        WHERE user_id IS NOT NULL
        GROUP BY user_id
        HAVING COUNT(*) = 1
    ),
    unique_conversations AS (
        SELECT DISTINCT ON (c.user_id)
            c.user_id,
            c.id AS conversation_id,
            c.workspace_id
        FROM conversations c
        JOIN single_user_conversations s ON s.user_id = c.user_id
        ORDER BY c.user_id, c.created_at ASC
    )
    """


def upgrade() -> None:
    _archive_table("rag_feedback", "rag_feedback_legacy_archive")
    _archive_table("learning_data", "learning_data_legacy_archive")

    op.add_column(
        "rag_feedback",
        sa.Column("workspace_id", sa.UUID(), nullable=True),
    )
    op.create_index("ix_rag_feedback_workspace_id", "rag_feedback", ["workspace_id"], unique=False)
    op.create_foreign_key(
        "fk_rag_feedback_workspace_id",
        "rag_feedback",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column("rag_feedback", "workspace_id", nullable=False)

    op.add_column(
        "learning_data",
        sa.Column("workspace_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "learning_data",
        sa.Column(
            "profile_version",
            sa.String(),
            nullable=False,
            server_default=sa.text("'v1'"),
        ),
    )
    op.create_index("ix_learning_data_workspace_id", "learning_data", ["workspace_id"], unique=False)
    op.create_foreign_key(
        "fk_learning_data_workspace_id",
        "learning_data",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column("learning_data", "workspace_id", nullable=False)

    op.add_column("conversation_states", sa.Column("workspace_id", sa.UUID(), nullable=True))
    op.add_column("conversation_states", sa.Column("conversation_id", sa.UUID(), nullable=True))
    op.execute(
        _conversation_mapping_cte() + """
        UPDATE conversation_states AS target
        SET workspace_id = source.workspace_id,
            conversation_id = source.conversation_id
        FROM unique_conversations AS source
        WHERE target.user_id = source.user_id
        """
    )
    _archive_rows(
        "conversation_states",
        "conversation_states_legacy_archive",
        "workspace_id IS NULL OR conversation_id IS NULL",
    )
    op.create_index(
        "ix_conversation_states_workspace_id",
        "conversation_states",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        "ix_conversation_states_conversation_id",
        "conversation_states",
        ["conversation_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_conversation_states_workspace_id",
        "conversation_states",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_conversation_states_conversation_id",
        "conversation_states",
        "conversations",
        ["conversation_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_unique_constraint(
        "uq_conversation_states_workspace_conversation",
        "conversation_states",
        ["workspace_id", "conversation_id"],
    )
    op.alter_column("conversation_states", "workspace_id", nullable=False)
    op.alter_column("conversation_states", "conversation_id", nullable=False)

    op.add_column("leads", sa.Column("workspace_id", sa.UUID(), nullable=True))
    op.add_column("leads", sa.Column("conversation_id", sa.UUID(), nullable=True))
    op.execute(
        _conversation_mapping_cte() + """
        UPDATE leads AS target
        SET workspace_id = source.workspace_id,
            conversation_id = source.conversation_id
        FROM unique_conversations AS source
        WHERE target.user_id = source.user_id
        """
    )
    _archive_rows("leads", "leads_legacy_archive", "workspace_id IS NULL OR conversation_id IS NULL")
    op.create_index("ix_leads_workspace_id", "leads", ["workspace_id"], unique=False)
    op.create_index("ix_leads_conversation_id", "leads", ["conversation_id"], unique=False)
    op.create_foreign_key(
        "fk_leads_workspace_id",
        "leads",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_leads_conversation_id",
        "leads",
        "conversations",
        ["conversation_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_unique_constraint("uq_leads_scope", "leads", ["workspace_id", "conversation_id"])
    op.alter_column("leads", "workspace_id", nullable=False)
    op.alter_column("leads", "conversation_id", nullable=False)

    op.add_column("sales_pipeline", sa.Column("workspace_id", sa.UUID(), nullable=True))
    op.add_column("sales_pipeline", sa.Column("conversation_id", sa.UUID(), nullable=True))
    op.execute(
        _conversation_mapping_cte() + """
        UPDATE sales_pipeline AS target
        SET workspace_id = source.workspace_id,
            conversation_id = source.conversation_id
        FROM unique_conversations AS source
        WHERE target.user_id = source.user_id
        """
    )
    _archive_rows(
        "sales_pipeline",
        "sales_pipeline_legacy_archive",
        "workspace_id IS NULL OR conversation_id IS NULL",
    )
    op.create_index("ix_sales_pipeline_workspace_id", "sales_pipeline", ["workspace_id"], unique=False)
    op.create_index(
        "ix_sales_pipeline_conversation_id",
        "sales_pipeline",
        ["conversation_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_sales_pipeline_workspace_id",
        "sales_pipeline",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_sales_pipeline_conversation_id",
        "sales_pipeline",
        "conversations",
        ["conversation_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_unique_constraint(
        "uq_sales_pipeline_scope",
        "sales_pipeline",
        ["workspace_id", "conversation_id"],
    )
    op.alter_column("sales_pipeline", "workspace_id", nullable=False)
    op.alter_column("sales_pipeline", "conversation_id", nullable=False)

    op.add_column("support_tickets", sa.Column("workspace_id", sa.UUID(), nullable=True))
    op.add_column("support_tickets", sa.Column("conversation_id", sa.UUID(), nullable=True))
    op.execute(
        _conversation_mapping_cte() + """
        UPDATE support_tickets AS target
        SET workspace_id = source.workspace_id,
            conversation_id = source.conversation_id
        FROM unique_conversations AS source
        WHERE target.user_id = source.user_id
        """
    )
    _archive_rows(
        "support_tickets",
        "support_tickets_legacy_archive",
        "workspace_id IS NULL OR conversation_id IS NULL",
    )
    op.create_index("ix_support_tickets_workspace_id", "support_tickets", ["workspace_id"], unique=False)
    op.create_index(
        "ix_support_tickets_conversation_id",
        "support_tickets",
        ["conversation_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_support_tickets_workspace_id",
        "support_tickets",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_support_tickets_conversation_id",
        "support_tickets",
        "conversations",
        ["conversation_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column("support_tickets", "workspace_id", nullable=False)
    op.alter_column("support_tickets", "conversation_id", nullable=False)

    op.add_column("followups_chat", sa.Column("workspace_id", sa.UUID(), nullable=True))
    op.add_column("followups_chat", sa.Column("conversation_id", sa.UUID(), nullable=True))
    op.execute(
        _conversation_mapping_cte() + """
        UPDATE followups_chat AS target
        SET workspace_id = source.workspace_id,
            conversation_id = source.conversation_id
        FROM unique_conversations AS source
        WHERE target.user_id = source.user_id
        """
    )
    _archive_rows(
        "followups_chat",
        "followups_chat_legacy_archive",
        "workspace_id IS NULL OR conversation_id IS NULL",
    )
    op.create_index("ix_followups_chat_workspace_id", "followups_chat", ["workspace_id"], unique=False)
    op.create_index(
        "ix_followups_chat_conversation_id",
        "followups_chat",
        ["conversation_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_followups_chat_workspace_id",
        "followups_chat",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_followups_chat_conversation_id",
        "followups_chat",
        "conversations",
        ["conversation_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column("followups_chat", "workspace_id", nullable=False)
    op.alter_column("followups_chat", "conversation_id", nullable=False)

    op.add_column("followups", sa.Column("workspace_id", sa.UUID(), nullable=True))
    op.execute(
        """
        UPDATE followups AS target
        SET workspace_id = source.workspace_id
        FROM conversations AS source
        WHERE target.conversation_id = source.id
        """
    )
    _archive_rows("followups", "followups_legacy_archive", "workspace_id IS NULL")
    op.create_index("ix_followups_workspace_id", "followups", ["workspace_id"], unique=False)
    op.create_foreign_key(
        "fk_followups_workspace_id",
        "followups",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column("followups", "workspace_id", nullable=False)

    op.add_column("human_escalations", sa.Column("workspace_id", sa.UUID(), nullable=True))
    op.add_column("human_escalations", sa.Column("channel", sa.String(length=50), nullable=True))
    op.add_column("human_escalations", sa.Column("message", sa.Text(), nullable=True))
    op.execute(
        """
        UPDATE human_escalations AS target
        SET workspace_id = source.workspace_id
        FROM conversations AS source
        WHERE target.conversation_id = source.id
        """
    )
    op.execute(
        _conversation_mapping_cte() + """
        UPDATE human_escalations AS target
        SET workspace_id = COALESCE(target.workspace_id, source.workspace_id),
            conversation_id = COALESCE(target.conversation_id, source.conversation_id)
        FROM unique_conversations AS source
        WHERE target.user_id = source.user_id
        """
    )
    _archive_rows(
        "human_escalations",
        "human_escalations_legacy_archive",
        "workspace_id IS NULL OR conversation_id IS NULL",
    )
    op.create_index(
        "ix_human_escalations_workspace_id",
        "human_escalations",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        "ix_human_escalations_conversation_id",
        "human_escalations",
        ["conversation_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_human_escalations_workspace_id",
        "human_escalations",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_human_escalations_conversation_id",
        "human_escalations",
        "conversations",
        ["conversation_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column("human_escalations", "workspace_id", nullable=False)
    op.alter_column("human_escalations", "conversation_id", nullable=False)


def downgrade() -> None:
    op.drop_constraint("fk_human_escalations_conversation_id", "human_escalations", type_="foreignkey")
    op.drop_constraint("fk_human_escalations_workspace_id", "human_escalations", type_="foreignkey")
    op.drop_index("ix_human_escalations_conversation_id", table_name="human_escalations")
    op.drop_index("ix_human_escalations_workspace_id", table_name="human_escalations")
    op.drop_column("human_escalations", "message")
    op.drop_column("human_escalations", "channel")
    op.drop_column("human_escalations", "workspace_id")

    op.drop_constraint("fk_followups_workspace_id", "followups", type_="foreignkey")
    op.drop_index("ix_followups_workspace_id", table_name="followups")
    op.drop_column("followups", "workspace_id")

    op.drop_constraint("fk_followups_chat_conversation_id", "followups_chat", type_="foreignkey")
    op.drop_constraint("fk_followups_chat_workspace_id", "followups_chat", type_="foreignkey")
    op.drop_index("ix_followups_chat_conversation_id", table_name="followups_chat")
    op.drop_index("ix_followups_chat_workspace_id", table_name="followups_chat")
    op.drop_column("followups_chat", "conversation_id")
    op.drop_column("followups_chat", "workspace_id")

    op.drop_constraint("fk_support_tickets_conversation_id", "support_tickets", type_="foreignkey")
    op.drop_constraint("fk_support_tickets_workspace_id", "support_tickets", type_="foreignkey")
    op.drop_index("ix_support_tickets_conversation_id", table_name="support_tickets")
    op.drop_index("ix_support_tickets_workspace_id", table_name="support_tickets")
    op.drop_column("support_tickets", "conversation_id")
    op.drop_column("support_tickets", "workspace_id")

    op.drop_constraint("uq_sales_pipeline_scope", "sales_pipeline", type_="unique")
    op.drop_constraint("fk_sales_pipeline_conversation_id", "sales_pipeline", type_="foreignkey")
    op.drop_constraint("fk_sales_pipeline_workspace_id", "sales_pipeline", type_="foreignkey")
    op.drop_index("ix_sales_pipeline_conversation_id", table_name="sales_pipeline")
    op.drop_index("ix_sales_pipeline_workspace_id", table_name="sales_pipeline")
    op.drop_column("sales_pipeline", "conversation_id")
    op.drop_column("sales_pipeline", "workspace_id")

    op.drop_constraint("uq_leads_scope", "leads", type_="unique")
    op.drop_constraint("fk_leads_conversation_id", "leads", type_="foreignkey")
    op.drop_constraint("fk_leads_workspace_id", "leads", type_="foreignkey")
    op.drop_index("ix_leads_conversation_id", table_name="leads")
    op.drop_index("ix_leads_workspace_id", table_name="leads")
    op.drop_column("leads", "conversation_id")
    op.drop_column("leads", "workspace_id")

    op.drop_constraint(
        "uq_conversation_states_workspace_conversation",
        "conversation_states",
        type_="unique",
    )
    op.drop_constraint("fk_conversation_states_conversation_id", "conversation_states", type_="foreignkey")
    op.drop_constraint("fk_conversation_states_workspace_id", "conversation_states", type_="foreignkey")
    op.drop_index("ix_conversation_states_conversation_id", table_name="conversation_states")
    op.drop_index("ix_conversation_states_workspace_id", table_name="conversation_states")
    op.drop_column("conversation_states", "conversation_id")
    op.drop_column("conversation_states", "workspace_id")

    op.drop_constraint("fk_learning_data_workspace_id", "learning_data", type_="foreignkey")
    op.drop_index("ix_learning_data_workspace_id", table_name="learning_data")
    op.drop_column("learning_data", "profile_version")
    op.drop_column("learning_data", "workspace_id")

    op.drop_constraint("fk_rag_feedback_workspace_id", "rag_feedback", type_="foreignkey")
    op.drop_index("ix_rag_feedback_workspace_id", table_name="rag_feedback")
    op.drop_column("rag_feedback", "workspace_id")
