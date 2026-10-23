"""add lead report only_new_leads and lead last_reported_at

Revision ID: d1e2f3a4b5c6
Revises: b7d8e9f0a1c2, c3e5a7b9d102
Create Date: 2026-10-23 12:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = ('b7d8e9f0a1c2', 'c3e5a7b9d102')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'leads' in tables:
        columns = [c['name'] for c in inspector.get_columns('leads')]
        indexes = [ix['name'] for ix in inspector.get_indexes('leads')]
        with op.batch_alter_table('leads', schema=None) as batch_op:
            if 'last_reported_at' not in columns:
                batch_op.add_column(sa.Column('last_reported_at', sa.DateTime(timezone=True), nullable=True))
            if 'ix_leads_last_reported_at' not in indexes:
                batch_op.create_index('ix_leads_last_reported_at', ['last_reported_at'], unique=False)

    if 'lead_report_settings' in tables:
        columns = [c['name'] for c in inspector.get_columns('lead_report_settings')]
        with op.batch_alter_table('lead_report_settings', schema=None) as batch_op:
            if 'only_new_leads' not in columns:
                batch_op.add_column(sa.Column('only_new_leads', sa.Boolean(), nullable=False, server_default=sa.text('true')))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'lead_report_settings' in tables:
        columns = [c['name'] for c in inspector.get_columns('lead_report_settings')]
        with op.batch_alter_table('lead_report_settings', schema=None) as batch_op:
            if 'only_new_leads' in columns:
                batch_op.drop_column('only_new_leads')

    if 'leads' in tables:
        columns = [c['name'] for c in inspector.get_columns('leads')]
        indexes = [ix['name'] for ix in inspector.get_indexes('leads')]
        with op.batch_alter_table('leads', schema=None) as batch_op:
            if 'ix_leads_last_reported_at' in indexes:
                batch_op.drop_index('ix_leads_last_reported_at')
            if 'last_reported_at' in columns:
                batch_op.drop_column('last_reported_at')
