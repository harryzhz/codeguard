from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture()
async def finding_id(client: AsyncClient):
    await client.post("/api/v1/projects", json={"name": "fp"})
    resp = await client.post(
        "/api/v1/projects/fp/reviews",
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
        headers={"Authorization": "Bearer test-api-key"},
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
        "/api/v1/findings/nonexistent",
        json={"status": "dismissed"},
    )
    assert resp.status_code == 404


async def test_update_finding_invalid_status(client: AsyncClient, finding_id: str):
    resp = await client.patch(
        f"/api/v1/findings/{finding_id}",
        json={"status": "invalid_status"},
    )
    assert resp.status_code == 422
