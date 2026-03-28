from __future__ import annotations

import pytest

from app.models import (
    FindingCreate,
    ProjectCreate,
    ReviewCreate,
)
from app.storage.postgres import PostgresReviewRepository


pytestmark = pytest.mark.asyncio


async def test_create_and_get_project(repo: PostgresReviewRepository):
    p = await repo.create_project(ProjectCreate(name="proj1"))
    assert p.name == "proj1"
    assert isinstance(p.id, str)

    fetched = await repo.get_project(p.id)
    assert fetched is not None
    assert fetched.id == p.id


async def test_get_project_not_found(repo: PostgresReviewRepository):
    assert await repo.get_project("nonexistent") is None


async def test_get_project_by_name(repo: PostgresReviewRepository):
    p = await repo.create_project(ProjectCreate(name="proj2"))
    fetched = await repo.get_project_by_name("proj2")
    assert fetched is not None
    assert fetched.id == p.id

    assert await repo.get_project_by_name("nonexistent") is None


async def test_list_projects(repo: PostgresReviewRepository):
    await repo.create_project(ProjectCreate(name="a"))
    await repo.create_project(ProjectCreate(name="b"))
    projects = await repo.list_projects()
    assert len(projects) == 2


async def test_create_review_with_findings(repo: PostgresReviewRepository):
    p = await repo.create_project(ProjectCreate(name="rp"))
    review = await repo.create_review(
        p.id,
        ReviewCreate(
            summary={"total": 1},
            files_changed=["a.py"],
            findings=[
                FindingCreate(
                    severity="critical",
                    confidence=0.95,
                    title="Eval detected",
                    description="bad",
                    category="security",
                    evidence_chain=[{"step": "found"}],
                    suggestion="remove eval",
                )
            ],
        ),
    )
    assert review.version == 1
    assert len(review.findings) == 1
    assert review.findings[0].severity == "critical"


async def test_list_reviews(repo: PostgresReviewRepository):
    p = await repo.create_project(ProjectCreate(name="rp3"))
    await repo.create_review(p.id, ReviewCreate())
    await repo.create_review(p.id, ReviewCreate())
    reviews = await repo.list_reviews(p.id)
    assert len(reviews) == 2


async def test_update_finding_status(repo: PostgresReviewRepository):
    p = await repo.create_project(ProjectCreate(name="rp4"))
    review = await repo.create_review(
        p.id,
        ReviewCreate(
            findings=[
                FindingCreate(
                    severity="warning",
                    confidence=0.7,
                    title="Issue",
                    description="m",
                    category="logic",
                    evidence_chain=[],
                    suggestion="fix",
                )
            ],
        ),
    )
    fid = review.findings[0].id
    updated = await repo.update_finding_status(fid, "accepted")
    assert updated is not None
    assert updated.status == "accepted"


async def test_update_finding_status_not_found(repo: PostgresReviewRepository):
    result = await repo.update_finding_status("nonexistent", "dismissed")
    assert result is None
