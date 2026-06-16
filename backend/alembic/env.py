from logging.config import fileConfig
from sqlalchemy import create_engine
from sqlalchemy import pool
from alembic import context
from app.database import Base
from app.core.config import settings


from app.models.ai_action import *
from app.models.automation import *
from app.models.billing import *
from app.models.brain import *
from app.models.conversation import *
from app.models.feedback import *
from app.models.flow_execution import *
from app.models.followup import *
from app.models.impersonation import *
from app.models.integration import *
from app.models.invoice import *
from app.models.learning_event import *
from app.models.media import *
from app.models.message import *
from app.models.model_configs import *
from app.models.outbound_message import *
from app.models.plan import *
from app.models.platform_setting import *
# from app.models.promise import *
from app.models.scheduled_resume import *
from app.models.subscription_history import *
from app.models.subscription import *
from app.models.templates import *
from app.models.token_ledger import *
from app.models.usage import *
from app.models.user import *
from app.models.webhook_event import *
from app.models.workspace import *
from app.models.lead_scoring import *
from app.models.user_session import *
from app.models.notification import *

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = create_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()