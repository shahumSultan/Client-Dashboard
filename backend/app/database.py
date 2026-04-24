from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://").replace(
    "postgres://", "postgresql+asyncpg://"
)

engine = create_async_engine(DATABASE_URL, echo=settings.DEBUG, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
