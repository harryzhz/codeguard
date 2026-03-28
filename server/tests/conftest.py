from __future__ import annotations

import os

os.environ["CODEGUARD_API_KEY"] = "test-api-key"

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.tables import Base
from app.storage.postgres import PostgresReviewRepository
from app.api.deps import set_repository
from app.main import create_app


@pytest_asyncio.fixture()
async def engine():
    eng = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture()
async def session_factory(engine):
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest_asyncio.fixture()
async def repo(session_factory):
    return PostgresReviewRepository(session_factory)


@pytest_asyncio.fixture()
async def app(repo):
    set_repository(repo)
    return create_app(use_lifespan=False)


@pytest_asyncio.fixture()
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
