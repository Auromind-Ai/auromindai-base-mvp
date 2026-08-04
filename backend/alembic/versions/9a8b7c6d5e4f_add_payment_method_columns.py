"""add payment_method, payment_type, and description columns

Revision ID: 9a8b7c6d5e4f
Revises: h2i3j4k5l6m7
Create Date: 2026-07-29 12:25:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '9a8b7c6d5e4f'
down_revision = 'h2i3j4k5l6m7'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE wcc_recharge_logs ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50);")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS description VARCHAR(255);")


def downgrade():
    op.execute("ALTER TABLE wcc_recharge_logs DROP COLUMN IF EXISTS payment_method;")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS payment_method;")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS payment_type;")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS description;")
