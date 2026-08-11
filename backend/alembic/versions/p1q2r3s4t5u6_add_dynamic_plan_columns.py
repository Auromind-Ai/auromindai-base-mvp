"""add dynamic plan columns and migrate pricing

Revision ID: p1q2r3s4t5u6
Revises: n1o2p3q4r5s6
Create Date: 2026-08-08 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import json


revision: str = 'p1q2r3s4t5u6'
down_revision: Union[str, Sequence[str], None] = 'n1o2p3q4r5s6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add new columns to plans table if not already present
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('plans')]

    if 'monthly_price' not in columns:
        op.add_column('plans', sa.Column('monthly_price', sa.Integer(), server_default='0', nullable=False))
    if 'yearly_price' not in columns:
        op.add_column('plans', sa.Column('yearly_price', sa.Integer(), server_default='0', nullable=False))
    if 'display_order' not in columns:
        op.add_column('plans', sa.Column('display_order', sa.Integer(), server_default='0', nullable=False))
    if 'is_featured' not in columns:
        op.add_column('plans', sa.Column('is_featured', sa.Boolean(), server_default='false', nullable=False))
    if 'display_name' not in columns:
        op.add_column('plans', sa.Column('display_name', sa.String(), nullable=True))
    if 'description' not in columns:
        op.add_column('plans', sa.Column('description', sa.String(), nullable=True))

    # 2. Migrate existing data from price to monthly_price
    op.execute("UPDATE plans SET monthly_price = price WHERE monthly_price = 0 AND price > 0")

    # 3. Seed / Update 4 standard plans with exact monthly and yearly prices
    standard_plans = [
        {
            "name": "free",
            "display_name": "Free",
            "monthly_price": 0,
            "yearly_price": 0,
            "display_order": 1,
            "is_featured": False,
            "description": "Try Orbion Agents for free and see the ROI yourself.",
            "token_limit": 1000000,
            "features": ["1,000 AI Replies", "Basic Workflows", "Meta API Included"]
        },
        {
            "name": "solo",
            "display_name": "Solo Smart",
            "monthly_price": 999,
            "yearly_price": 9990,
            "display_order": 2,
            "is_featured": False,
            "description": "RAG & custom knowledge base on a budget for solopreneurs.",
            "token_limit": 15000000,
            "features": ["15,000 AI Replies", "RAG Knowledge Base Enabled", "1 Gmail Integration", "Basic Automations"]
        },
        {
            "name": "pro",
            "display_name": "Professional",
            "monthly_price": 5999,
            "yearly_price": 59990,
            "display_order": 3,
            "is_featured": True,
            "description": "Advanced features for growing teams and scalable workflows.",
            "token_limit": 100000000,
            "features": ["100,000 AI Replies", "Advanced Workflows + RAG", "Priority Support", "Full Analytics"]
        },
        {
            "name": "enterprise",
            "display_name": "Business",
            "monthly_price": 24999,
            "yearly_price": 249990,
            "display_order": 4,
            "is_featured": False,
            "description": "Perfect for businesses starting with AI automation at scale.",
            "token_limit": 500000000,
            "features": ["500,000 AI Replies", "Dedicated Manager", "Custom API Access", "On-premise Options", "Global SLA"]
        }
    ]

    for p in standard_plans:
        features_json = json.dumps(p["features"])
        conn.execute(sa.text("""
            INSERT INTO plans (
                id, name, display_name, price, monthly_price, yearly_price, 
                display_order, is_featured, description, token_limit, 
                currency, is_active, billing_cycle, features
            ) VALUES (
                gen_random_uuid(), :name, :display_name, :monthly_price, :monthly_price, :yearly_price,
                :display_order, :is_featured, :description, :token_limit,
                'INR', true, 'monthly', CAST(:features AS json)
            )
            ON CONFLICT (name) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                price = EXCLUDED.monthly_price,
                monthly_price = EXCLUDED.monthly_price,
                yearly_price = EXCLUDED.yearly_price,
                display_order = EXCLUDED.display_order,
                is_featured = EXCLUDED.is_featured,
                description = EXCLUDED.description,
                token_limit = EXCLUDED.token_limit,
                features = EXCLUDED.features
        """), {
            "name": p["name"],
            "display_name": p["display_name"],
            "monthly_price": p["monthly_price"],
            "yearly_price": p["yearly_price"],
            "display_order": p["display_order"],
            "is_featured": p["is_featured"],
            "description": p["description"],
            "token_limit": p["token_limit"],
            "features": features_json
        })


def downgrade() -> None:
    op.drop_column('plans', 'description')
    op.drop_column('plans', 'display_name')
    op.drop_column('plans', 'is_featured')
    op.drop_column('plans', 'display_order')
    op.drop_column('plans', 'yearly_price')
    op.drop_column('plans', 'monthly_price')
