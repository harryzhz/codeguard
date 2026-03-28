from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.api.deps import set_repository
from app.main import create_app
from app.storage.postgres import PostgresReviewRepository


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture()
async def client(repo: PostgresReviewRepository):
    set_repository(repo)
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_create_project(client: AsyncClient):
    resp = await client.post(
        "/api/v1/projects/",
        json={"name": "proj-a", "repo_url": "https://example.com/a"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "proj-a"
    assert "api_key" in data


async def test_create_project_duplicate(client: AsyncClient):
    payload = {"name": "dup", "repo_url": "https://example.com/dup"}
    await client.post("/api/v1/projects/", json=payload)
    resp = await client.post("/api/v1/projects/", json=payload)
    assert resp.status_code == 409


async def test_list_projects(client: AsyncClient):
    await client.post(
        "/api/v1/projects/",
        json={"name": "p1", "repo_url": "u"},
    )
    resp = await client.get("/api/v1/projects/")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


async def test_get_project(client: AsyncClient):
    create_resp = await client.post(
        "/api/v1/projects/",
        json={"name": "p2", "repo_url": "u"},
    )
    pid = create_resp.json()["id"]
    resp = await client.get(f"/api/v1/projects/{pid}")
    assert resp.status_code == 200
    assert resp.json()["id"] == pid


async def test_get_project_not_found(client: AsyncClient):
    resp = await client.get(f"/api/v1/projects/{uuid.uuid4()}")
    assert resp.status_code == 404
