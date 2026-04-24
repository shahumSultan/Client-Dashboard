import asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.config import settings
from app.database import Base
import app.models  # noqa: F401 – ensure all models are registered

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://").replace(
    "postgres://", "postgresql+asyncpg://"
)


def run_migrations_offline():
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as connection:
        await connection.run_sync(
            lambda conn: context.configure(connection=conn, target_metadata=target_metadata)
        )
        async with connection.begin():
            await connection.run_sync(lambda conn: context.run_migrations())
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
