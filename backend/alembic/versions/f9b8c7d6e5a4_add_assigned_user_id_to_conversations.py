
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = 'f9b8c7d6e5a4'
down_revision = 'b2c3d4e5f6g7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('conversations', sa.Column('assigned_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_conversations_assigned_user_id', 'conversations', ['assigned_user_id'])


def downgrade():
    op.drop_index('ix_conversations_assigned_user_id', table_name='conversations')
    op.drop_column('conversations', 'assigned_user_id')
