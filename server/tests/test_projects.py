from __future__ import annotations

import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio


async def test_create_project(client: AsyncClient):
    resp = await client.post(
        "/api/v1/projects",
        json={"name": "proj-a"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "proj-a"
    assert isinstance(data["id"], str)
    assert "api_key" not in data


async def test_create_project_duplicate(client: AsyncClient):
    payload = {"name": "dup"}
    await client.post("/api/v1/projects", json=payload)
    resp = await client.post("/api/v1/projects", json=payload)
    assert resp.status_code == 409


async def test_list_projects(client: AsyncClient):
    await client.post(
        "/api/v1/projects",
        json={"name": "p1"},
    )
    resp = await client.get("/api/v1/projects")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


async def test_get_project(client: AsyncClient):
    await client.post(
        "/api/v1/projects",
        json={"name": "p2"},
    )
    resp = await client.get("/api/v1/projects/p2")
    assert resp.status_code == 200
    assert resp.json()["name"] == "p2"


async def test_get_project_not_found(client: AsyncClient):
    resp = await client.get("/api/v1/projects/nonexistent")
    assert resp.status_code == 404
