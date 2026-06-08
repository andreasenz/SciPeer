import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_session
from app.main import app

TEST_DB_URL = "postgresql+asyncpg://scipeer:scipeer@localhost:5432/scipeer_test"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionFactory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

SCHEMAS = ("identity", "papers", "reviews", "doi", "gamification", "notifications")


@pytest_asyncio.fixture(scope="session", loop_scope="session", autouse=True)
async def create_tables():
    async with test_engine.begin() as conn:
        for schema in SCHEMAS:
            await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        for schema in reversed(SCHEMAS):
            await conn.execute(text(f"DROP SCHEMA IF EXISTS {schema} CASCADE"))


@pytest_asyncio.fixture(loop_scope="session")
async def session():
    async with TestSessionFactory() as s:
        yield s
        await s.rollback()


@pytest_asyncio.fixture(loop_scope="session")
async def client(session: AsyncSession):
    app.dependency_overrides[get_session] = lambda: session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
