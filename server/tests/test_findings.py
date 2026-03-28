from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.api.deps import set_repository
from app.main import create_app
from app.models import ProjectCreate
from app.storage.postgres import PostgresReviewRepository


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture()
async def client(repo: PostgresReviewRepository):
    set_repository(repo)
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture()
async def finding_id(client: AsyncClient, repo: PostgresReviewRepository):
    p = await repo.create_project(ProjectCreate(name="fp"))
    resp = await client.post(
        "/api/v1/reviews/",
        json={
            "version": "1.0",
            "findings": [
                {
                    "severity": "warning",
                    "confidence": 0.8,
                    "title": "Issue found",
                    "description": "msg",
                    "category": "logic",
                    "evidence_chain": [{"step": "detected"}],
                    "suggestion": "fix it",
                }
            ],
        },
        headers={"Authorization": f"Bearer {p.api_key}"},
    )
    return resp.json()["findings"][0]["id"]


async def test_update_finding_status(client: AsyncClient, finding_id: str):
    resp = await client.patch(
        f"/api/v1/findings/{finding_id}",
        json={"status": "accepted"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"


async def test_update_finding_not_found(client: AsyncClient):
    resp = await client.patch(
        f"/api/v1/findings/{uuid.uuid4()}",
        json={"status": "dismissed"},
    )
    assert resp.status_code == 404


async def test_update_finding_invalid_status(client: AsyncClient, finding_id: str):
    resp = await client.patch(
        f"/api/v1/findings/{finding_id}",
        json={"status": "invalid_status"},
    )
    assert resp.status_code == 422
