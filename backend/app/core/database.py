import asyncio
import logging
import re
import ssl
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.core.config import settings

logger = logging.getLogger("peblo.database")

Base = declarative_base()


def normalize_database_url(url: str) -> tuple[str, dict]:
    """
    Normalizes database connection strings for async SQLAlchemy + asyncpg:
    1. Converts postgres:// or postgresql:// to postgresql+asyncpg://
    2. Strips sslmode= query params and configures permissive SSL context
    """
    connect_args = {}

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "sqlite" in url:
        connect_args["check_same_thread"] = False
    elif "postgresql" in url:
        # Permissive SSL context for cloud providers (Render, Neon, Supabase, etc.)
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_ctx

        # Strip query parameters that cause asyncpg crashes
        url = re.sub(r"[?&]sslmode=[^&]+", "", url)
        url = re.sub(r"[?&]ssl=[^&]+", "", url)

    return url, connect_args


primary_url, primary_connect_args = normalize_database_url(settings.DATABASE_URL)

engine = create_async_engine(
    primary_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    connect_args=primary_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

ACTIVE_DB_TYPE = "postgresql" if "postgresql" in primary_url else "sqlite"


async def init_database_connection(max_retries: int = 3, retry_delay: float = 2.0):
    """
    Initializes and verifies the database connection.
    Attempts to connect to primary DATABASE_URL with retries.
    If PostgreSQL fails, automatically falls back to local SQLite so the
    application never crashes on startup.
    """
    global engine, AsyncSessionLocal, ACTIVE_DB_TYPE

    connected = False
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
                await conn.run_sync(Base.metadata.create_all)
            connected = True
            logger.info("Successfully connected to primary database (%s)", ACTIVE_DB_TYPE)
            break
        except Exception as err:
            last_error = err
            logger.warning(
                "Primary database connection attempt %d/%d failed: %s",
                attempt,
                max_retries,
                err,
            )
            if attempt < max_retries:
                await asyncio.sleep(retry_delay)

    if not connected:
        logger.error(
            "Primary database connection failed after %d attempts: %s. "
            "Falling back to local SQLite database so application starts successfully.",
            max_retries,
            last_error,
        )
        try:
            await engine.dispose()
        except Exception:
            pass

        fallback_url = "sqlite+aiosqlite:///./peblo.db"
        ACTIVE_DB_TYPE = "sqlite"
        engine = create_async_engine(
            fallback_url,
            echo=False,
            future=True,
            pool_pre_ping=True,
            connect_args={"check_same_thread": False},
        )
        AsyncSessionLocal.configure(bind=engine)

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Fallback SQLite database initialized successfully at ./peblo.db")


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
