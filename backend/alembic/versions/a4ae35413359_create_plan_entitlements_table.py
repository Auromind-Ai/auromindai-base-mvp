"""create_plan_entitlements_table

Revision ID: a4ae35413359
Revises: 18046b90ce50
Create Date: 2026-06-18 12:39:01.955555

"""
import uuid
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4ae35413359'
down_revision: Union[str, Sequence[str], None] = '18046b90ce50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Create plan_entitlements table
    op.create_table('plan_entitlements',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('plan_id', sa.UUID(), nullable=False),
        sa.Column('included_ai_credits', sa.Integer(), nullable=False),
        sa.Column('included_wcc_wallet', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('storage_limit_mb', sa.Integer(), nullable=False),
        sa.Column('team_limit', sa.Integer(), nullable=False),
        sa.Column('knowledge_base_limit', sa.Integer(), nullable=False),
        sa.Column('gmail_limit', sa.Integer(), nullable=False),
        sa.Column('lead_limit', sa.Integer(), nullable=False),
        sa.Column('meeting_limit', sa.Integer(), nullable=False),
        sa.Column('automation_limit', sa.Integer(), nullable=False),
        sa.Column('allow_ai_topup', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('allow_wcc_recharge', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('included_credit_reset_policy', sa.String(length=50), nullable=False, server_default='EXPIRE'),
        sa.Column('included_wallet_reset_policy', sa.String(length=50), nullable=False, server_default='EXPIRE'),
        sa.Column('feature_flags', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['plan_id'], ['plans.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_plan_entitlements_plan_id'), 'plan_entitlements', ['plan_id'], unique=True)

    # 2. Create feature_billing_rules table
    op.create_table('feature_billing_rules',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('feature_key', sa.String(length=100), nullable=False),
        sa.Column('feature_name', sa.String(length=255), nullable=False),
        sa.Column('billing_type', sa.String(length=50), nullable=False),
        sa.Column('unit_value', sa.Integer(), nullable=False),
        sa.Column('credit_cost', sa.Numeric(precision=10, scale=4), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_feature_billing_rules_feature_key'), 'feature_billing_rules', ['feature_key'], unique=True)

    # 3. Seed Default Plan Entitlements (Idempotently)
    bind = op.get_bind()
    res = bind.execute(sa.text("SELECT id, name FROM plans"))
    plans = {row[1]: str(row[0]) for row in res.fetchall()}

    # Check plans and insert defaults
    for name, plan_id in plans.items():
        # Check if entitlement already exists for the plan to ensure idempotency
        exist_check = bind.execute(
            sa.text("SELECT id FROM plan_entitlements WHERE plan_id = :plan_id"),
            {"plan_id": plan_id}
        ).fetchone()

        if not exist_check:
            ent_id = str(uuid.uuid4())
            if name == "free":
                bind.execute(
                    sa.text("""
                        INSERT INTO plan_entitlements (
                            id, plan_id, included_ai_credits, included_wcc_wallet, 
                            storage_limit_mb, team_limit, knowledge_base_limit, 
                            gmail_limit, lead_limit, meeting_limit, automation_limit,
                            allow_ai_topup, allow_wcc_recharge, 
                            included_credit_reset_policy, included_wallet_reset_policy,
                            feature_flags
                        ) VALUES (
                            :id, :plan_id, 1000, 0.00, 
                            500, 2, 5, 
                            1, 100, 10, 2,
                            true, true, 
                            'EXPIRE', 'EXPIRE',
                            '{"has_rag": false, "has_leads": true, "has_gmail": true}'
                        )
                    """),
                    {"id": ent_id, "plan_id": plan_id}
                )
            elif name == "pro":
                bind.execute(
                    sa.text("""
                        INSERT INTO plan_entitlements (
                            id, plan_id, included_ai_credits, included_wcc_wallet, 
                            storage_limit_mb, team_limit, knowledge_base_limit, 
                            gmail_limit, lead_limit, meeting_limit, automation_limit,
                            allow_ai_topup, allow_wcc_recharge, 
                            included_credit_reset_policy, included_wallet_reset_policy,
                            feature_flags
                        ) VALUES (
                            :id, :plan_id, 100000, 0.00, 
                            10240, 10, 100, 
                            5, 10000, -1, 20,
                            true, true, 
                            'EXPIRE', 'EXPIRE',
                            '{"has_rag": true, "has_leads": true, "has_gmail": true}'
                        )
                    """),
                    {"id": ent_id, "plan_id": plan_id}
                )
            elif name == "enterprise":
                bind.execute(
                    sa.text("""
                        INSERT INTO plan_entitlements (
                            id, plan_id, included_ai_credits, included_wcc_wallet, 
                            storage_limit_mb, team_limit, knowledge_base_limit, 
                            gmail_limit, lead_limit, meeting_limit, automation_limit,
                            allow_ai_topup, allow_wcc_recharge, 
                            included_credit_reset_policy, included_wallet_reset_policy,
                            feature_flags
                        ) VALUES (
                            :id, :plan_id, 500000, 500.00, 
                            102400, 50, 1000, 
                            -1, -1, -1, -1,
                            true, true, 
                            'ROLLOVER', 'ROLLOVER',
                            '{"has_rag": true, "has_leads": true, "has_gmail": true}'
                        )
                    """),
                    {"id": ent_id, "plan_id": plan_id}
                )

    # 4. Seed Default Feature Billing Rules (Idempotently)
    default_rules = [
        ("ai_chat", "AI Chat", "TOKEN", 1000, 1.0000, "Standard AI chat conversation per 1000 tokens"),
        ("gmail_draft", "Gmail Draft", "FLAT", 1, 2.0000, "AI generation of a Gmail draft email response"),
        ("lead_qualification", "Lead Qualification", "FLAT", 1, 5.0000, "AI agent lead qualification screening"),
        ("meeting_booking", "Meeting Booking", "FLAT", 1, 10.0000, "AI scheduling and calendar booking event"),
        ("knowledge_base_upload", "Knowledge Base Upload", "PER_MB", 1, 0.5000, "Vector indexing of custom knowledge documents per MB"),
    ]

    for key, name, b_type, u_val, cost, desc in default_rules:
        # Idempotency check for rules
        exist_check = bind.execute(
            sa.text("SELECT id FROM feature_billing_rules WHERE feature_key = :key"),
            {"key": key}
        ).fetchone()

        if not exist_check:
            rule_id = str(uuid.uuid4())
            bind.execute(
                sa.text("""
                    INSERT INTO feature_billing_rules (
                        id, feature_key, feature_name, billing_type, unit_value, credit_cost, is_active, description
                    ) VALUES (
                        :id, :key, :name, :b_type, :u_val, :cost, true, :desc
                    )
                """),
                {"id": rule_id, "key": key, "name": name, "b_type": b_type, "u_val": u_val, "cost": cost, "desc": desc}
            )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_feature_billing_rules_feature_key'), table_name='feature_billing_rules')
    op.drop_table('feature_billing_rules')
    op.drop_index(op.f('ix_plan_entitlements_plan_id'), table_name='plan_entitlements')
    op.drop_table('plan_entitlements')
