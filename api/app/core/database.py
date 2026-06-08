from collections.abc import AsyncGenerator
from uuid import UUID, uuid7

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import settings


def _create_engine(url: str) -> AsyncEngine:
    return create_async_engine(url, echo=settings.app_env == "development", pool_pre_ping=True)


engine = _create_engine(settings.database_url)
read_engine = _create_engine(settings.database_replica_url or settings.database_url)

SessionFactory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
ReadSessionFactory = async_sessionmaker(read_engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


class UUIDBase(Base):
    """Abstract base for all tables — UUID v7 primary key, no auto-increment."""

    __abstract__ = True
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid7)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionFactory() as session:
        yield session


async def get_read_session() -> AsyncGenerator[AsyncSession, None]:
    async with ReadSessionFactory() as session:
        yield session


async def check_db() -> bool:
    try:
        async with SessionFactory() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
