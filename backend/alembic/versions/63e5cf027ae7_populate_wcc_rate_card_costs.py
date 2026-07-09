"""populate_wcc_rate_card_costs

Revision ID: 63e5cf027ae7
Revises: 18068968afb9
Create Date: 2026-07-08 09:10:24.811246

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '63e5cf027ae7'
down_revision: Union[str, Sequence[str], None] = '18068968afb9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Populate specific default meta_cost and customer_price values for seeded India (IN) rates
    op.execute(
        """
        UPDATE wcc_rate_cards 
        SET meta_cost = 1.0900, customer_price = 1.2500 
        WHERE category = 'marketing' AND region = 'IN' AND (meta_cost IS NULL OR customer_price IS NULL);
        """
    )
    op.execute(
        """
        UPDATE wcc_rate_cards 
        SET meta_cost = 0.1450, customer_price = 0.1800 
        WHERE category = 'utility' AND region = 'IN' AND (meta_cost IS NULL OR customer_price IS NULL);
        """
    )
    op.execute(
        """
        UPDATE wcc_rate_cards 
        SET meta_cost = 0.1450, customer_price = 0.1800 
        WHERE category = 'authentication' AND region = 'IN' AND (meta_cost IS NULL OR customer_price IS NULL);
        """
    )
    op.execute(
        """
        UPDATE wcc_rate_cards 
        SET meta_cost = 0.0000, customer_price = 0.0500 
        WHERE category = 'service' AND region = 'IN' AND (meta_cost IS NULL OR customer_price IS NULL);
        """
    )
    # Generic fallback for any other rows to ensure no NULLs remain
    op.execute(
        """
        UPDATE wcc_rate_cards 
        SET meta_cost = COALESCE(meta_cost, rate_per_message, 0.0000),
            customer_price = COALESCE(customer_price, rate_per_message, 0.0000)
        WHERE meta_cost IS NULL OR customer_price IS NULL;
        """
    )

    # Idempotent alignment of feature billing rules
    import uuid
    bind = op.get_bind()
    bind.execute(sa.text("UPDATE feature_billing_rules SET feature_key = 'chat', feature_name = 'AI Chat' WHERE feature_key = 'ai_chat'"))
    bind.execute(sa.text("UPDATE feature_billing_rules SET feature_key = 'template', feature_name = 'Gmail Template' WHERE feature_key = 'gmail_draft'"))
    bind.execute(sa.text("UPDATE feature_billing_rules SET feature_key = 'knowledge', feature_name = 'Knowledge Base Upload' WHERE feature_key = 'knowledge_base_upload'"))
    bind.execute(sa.text("UPDATE feature_billing_rules SET feature_key = 'rag', feature_name = 'Agentic RAG Query', billing_type = 'TOKEN', unit_value = 1000, credit_cost = 1.5000 WHERE feature_key = 'agentic_rag'"))
    
    # Insert inbox rule
    inbox_exists = bind.execute(sa.text("SELECT id FROM feature_billing_rules WHERE feature_key = 'inbox'")).fetchone()
    if not inbox_exists:
        bind.execute(sa.text(
            "INSERT INTO feature_billing_rules (id, feature_key, feature_name, billing_type, unit_value, credit_cost, is_active, description) "
            "VALUES (:id, 'inbox', 'Inbox Agent Message', 'FLAT', 1, 5.0000, true, 'AI inbox agent message execution')"
        ), {"id": str(uuid.uuid4())})
        
    # Insert flow rule
    flow_exists = bind.execute(sa.text("SELECT id FROM feature_billing_rules WHERE feature_key = 'flow'")).fetchone()
    if not flow_exists:
        bind.execute(sa.text(
            "INSERT INTO feature_billing_rules (id, feature_key, feature_name, billing_type, unit_value, credit_cost, is_active, description) "
            "VALUES (:id, 'flow', 'Flow Generation', 'FLAT', 1, 3.0000, true, 'AI automation flow path generation')"
        ), {"id": str(uuid.uuid4())})
        
    # Insert rag rule
    rag_exists = bind.execute(sa.text("SELECT id FROM feature_billing_rules WHERE feature_key = 'rag'")).fetchone()
    if not rag_exists:
        bind.execute(sa.text(
            "INSERT INTO feature_billing_rules (id, feature_key, feature_name, billing_type, unit_value, credit_cost, is_active, description) "
            "VALUES (:id, 'rag', 'Agentic RAG Query', 'TOKEN', 1000, 1.5000, true, 'Retrieval augmented generation query processing per 1000 tokens')"
        ), {"id": str(uuid.uuid4())})


def downgrade() -> None:
    """Downgrade schema."""
    pass
