"""simplify_model_configs

Revision ID: d3e4f5a6b7c8
Revises: c1d2e3f4a5b6
Create Date: 2026-06-26 15:45:00.000000

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop the unique index on name
    op.drop_index('ix_model_configs_name', table_name='model_configs')
    
    # 2. Re-create the index on name as non-unique
    op.create_index('ix_model_configs_name', 'model_configs', ['name'], unique=False)
    
    # 3. Add feature_key and experience_level columns (nullable initially to allow smooth migration)
    op.add_column('model_configs', sa.Column('feature_key', sa.String(length=100), nullable=True))
    op.add_column('model_configs', sa.Column('experience_level', sa.String(length=50), nullable=True))
    
    # 4. Create indexes for quick lookups
    op.create_index('ix_model_configs_feature_key', 'model_configs', ['feature_key'], unique=False)
    op.create_index('ix_model_configs_experience_level', 'model_configs', ['experience_level'], unique=False)
    
    # 5. Create composite unique constraint on (feature_key, experience_level)
    op.create_unique_constraint('uq_model_configs_feature_experience', 'model_configs', ['feature_key', 'experience_level'])

    # 6. Update billing rule keys in feature_billing_rules table to align with AIFeatureRegistry constants
    bind = op.get_bind()
    bind.execute(sa.text("UPDATE feature_billing_rules SET feature_key = 'chat', feature_name = 'AI Chat' WHERE feature_key = 'ai_chat'"))
    bind.execute(sa.text("UPDATE feature_billing_rules SET feature_key = 'template', feature_name = 'Gmail Template' WHERE feature_key = 'gmail_draft'"))
    bind.execute(sa.text("UPDATE feature_billing_rules SET feature_key = 'knowledge', feature_name = 'Knowledge Base Upload' WHERE feature_key = 'knowledge_base_upload'"))
    
    # Insert inbox
    inbox_exists = bind.execute(sa.text("SELECT id FROM feature_billing_rules WHERE feature_key = 'inbox'")).fetchone()
    if not inbox_exists:
        bind.execute(sa.text(
            "INSERT INTO feature_billing_rules (id, feature_key, feature_name, billing_type, unit_value, credit_cost, is_active, description) "
            "VALUES (:id, 'inbox', 'Inbox Agent Message', 'FLAT', 1, 5.0000, true, 'AI inbox agent message execution')"
        ), {"id": str(uuid.uuid4())})
        
    # Insert flow
    flow_exists = bind.execute(sa.text("SELECT id FROM feature_billing_rules WHERE feature_key = 'flow'")).fetchone()
    if not flow_exists:
        bind.execute(sa.text(
            "INSERT INTO feature_billing_rules (id, feature_key, feature_name, billing_type, unit_value, credit_cost, is_active, description) "
            "VALUES (:id, 'flow', 'Flow Generation', 'FLAT', 1, 3.0000, true, 'AI automation flow path generation')"
        ), {"id": str(uuid.uuid4())})

    # Insert rag
    rag_exists = bind.execute(sa.text("SELECT id FROM feature_billing_rules WHERE feature_key = 'rag'")).fetchone()
    if not rag_exists:
        bind.execute(sa.text(
            "INSERT INTO feature_billing_rules (id, feature_key, feature_name, billing_type, unit_value, credit_cost, is_active, description) "
            "VALUES (:id, 'rag', 'Agentic RAG Query', 'TOKEN', 1000, 1.5000, true, 'Retrieval augmented generation query processing per 1000 tokens')"
        ), {"id": str(uuid.uuid4())})


def downgrade() -> None:
    # 1. Revert billing updates (optional/best effort)
    bind = op.get_bind()
    bind.execute(sa.text("UPDATE feature_billing_rules SET feature_key = 'ai_chat', feature_name = 'AI Chat' WHERE feature_key = 'chat'"))
    bind.execute(sa.text("UPDATE feature_billing_rules SET feature_key = 'gmail_draft', feature_name = 'Gmail Draft' WHERE feature_key = 'template'"))
    bind.execute(sa.text("UPDATE feature_billing_rules SET feature_key = 'knowledge_base_upload', feature_name = 'Knowledge Base Upload' WHERE feature_key = 'knowledge'"))
    bind.execute(sa.text("DELETE FROM feature_billing_rules WHERE feature_key IN ('inbox', 'flow', 'rag')"))

    # 2. Drop composite unique constraint
    op.drop_constraint('uq_model_configs_feature_experience', 'model_configs', type_='unique')
    
    # 3. Drop new indexes
    op.drop_index('ix_model_configs_experience_level', table_name='model_configs')
    op.drop_index('ix_model_configs_feature_key', table_name='model_configs')
    
    # 4. Drop added columns
    op.drop_column('model_configs', 'experience_level')
    op.drop_column('model_configs', 'feature_key')
    
    # 5. Drop non-unique index on name
    op.drop_index('ix_model_configs_name', table_name='model_configs')
    
    # 6. Re-create unique index on name
    op.create_index('ix_model_configs_name', 'model_configs', ['name'], unique=True)
