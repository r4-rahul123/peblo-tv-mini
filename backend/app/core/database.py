import re
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.core.config import settings


def normalize_database_url(url: str) -> str:
    """
    Normalizes database connection strings for async SQLAlchemy + asyncpg:
    1. Converts postgres:// or postgresql:// to postgresql+asyncpg://
    2. Converts ?sslmode= to ?ssl= (asyncpg compatibility)
    """
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # asyncpg does not accept sslmode= parameter, expects ssl=
    if "sslmode=" in url:
        url = re.sub(r"sslmode=([a-zA-Z0-9_-]+)", r"ssl=\1", url)

    return url


db_url = normalize_database_url(settings.DATABASE_URL)
connect_args = {}
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
