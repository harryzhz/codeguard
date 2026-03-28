from __future__ import annotations

import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio


async def test_create_review_authenticated(client: AsyncClient):
    await client.post("/api/v1/projects", json={"name": "review-proj"})
    resp = await client.post(
        "/api/v1/projects/review-proj/reviews",
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
        headers={"Authorization": "Bearer test-api-key"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["version"] == "1.0"
    assert len(data["findings"]) == 1


async def test_create_review_unauthenticated(client: AsyncClient):
    await client.post("/api/v1/projects", json={"name": "review-proj2"})
    resp = await client.post(
        "/api/v1/projects/review-proj2/reviews",
        json={"version": "1.0"},
        headers={"Authorization": "Bearer bad-key"},
    )
    assert resp.status_code == 401


async def test_create_review_no_bearer(client: AsyncClient):
    await client.post("/api/v1/projects", json={"name": "review-proj3"})
    resp = await client.post(
        "/api/v1/projects/review-proj3/reviews",
        json={"version": "1.0"},
    )
    assert resp.status_code == 401


async def test_list_reviews(client: AsyncClient):
    await client.post("/api/v1/projects", json={"name": "review-proj4"})
    await client.post(
        "/api/v1/projects/review-proj4/reviews",
        json={"version": "1.0"},
        headers={"Authorization": "Bearer test-api-key"},
    )
    resp = await client.get("/api/v1/projects/review-proj4/reviews")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


async def test_get_review(client: AsyncClient):
    await client.post("/api/v1/projects", json={"name": "review-proj5"})
    create_resp = await client.post(
        "/api/v1/projects/review-proj5/reviews",
        json={"version": "1.0"},
        headers={"Authorization": "Bearer test-api-key"},
    )
    rid = create_resp.json()["id"]
    resp = await client.get(f"/api/v1/projects/review-proj5/reviews/{rid}")
    assert resp.status_code == 200
    assert resp.json()["id"] == rid


async def test_get_review_not_found(client: AsyncClient):
    await client.post("/api/v1/projects", json={"name": "review-proj6"})
    resp = await client.get("/api/v1/projects/review-proj6/reviews/nonexistent")
    assert resp.status_code == 404
