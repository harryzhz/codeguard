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
async def project_with_key(repo: PostgresReviewRepository):
    p = await repo.create_project(ProjectCreate(name="review-proj"))
    return p


async def test_create_review_authenticated(client: AsyncClient, project_with_key):
    resp = await client.post(
        "/api/v1/reviews/",
        json={
            "version": "1.0",
            "summary": {"total": 1},
            "files_changed": ["a.py"],
            "findings": [
                {
                    "severity": "critical",
                    "confidence": 0.9,
                    "title": "Eval usage",
                    "description": "bad",
                    "category": "security",
                    "evidence_chain": [{"step": "found"}],
                    "suggestion": "remove eval",
                }
            ],
        },
        headers={"Authorization": f"Bearer {project_with_key.api_key}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["version"] == "1.0"
    assert len(data["findings"]) == 1


async def test_create_review_unauthenticated(client: AsyncClient):
    resp = await client.post(
        "/api/v1/reviews/",
        json={"version": "1.0"},
        headers={"Authorization": "Bearer bad-key"},
    )
    assert resp.status_code == 401


async def test_list_reviews(client: AsyncClient, project_with_key):
    headers = {"Authorization": f"Bearer {project_with_key.api_key}"}
    await client.post(
        "/api/v1/reviews/",
        json={"version": "1.0"},
        headers=headers,
    )
    resp = await client.get(
        "/api/v1/reviews/",
        params={"project_id": str(project_with_key.id)},
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


async def test_get_review(client: AsyncClient, project_with_key):
    headers = {"Authorization": f"Bearer {project_with_key.api_key}"}
    create_resp = await client.post(
        "/api/v1/reviews/",
        json={"version": "1.0"},
        headers=headers,
    )
    rid = create_resp.json()["id"]
    resp = await client.get(f"/api/v1/reviews/{rid}")
    assert resp.status_code == 200
    assert resp.json()["id"] == rid


async def test_get_review_not_found(client: AsyncClient):
    resp = await client.get(f"/api/v1/reviews/{uuid.uuid4()}")
    assert resp.status_code == 404
