"""Allow multiple report delivery times per scheduled day."""
from alembic import op
import sqlalchemy as sa

revision = "c9e2f4a6b803"
down_revision = "b7d9e1f3a502"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("lead_report_settings", sa.Column("send_times", sa.JSON(), nullable=True))


def downgrade():
    op.drop_column("lead_report_settings", "send_times")
