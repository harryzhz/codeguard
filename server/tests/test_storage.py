from __future__ import annotations

import uuid

import pytest
import pytest_asyncio

from app.models import (
    FindingStatusUpdate,
    ProjectCreate,
    ReviewCreate,
)
from app.models.finding import FindingStatus, Severity
from app.storage.postgres import PostgresReviewRepository


pytestmark = pytest.mark.asyncio


async def test_create_and_get_project(repo: PostgresReviewRepository):
    p = await repo.create_project(ProjectCreate(name="proj1", repo_url="https://x.com/r"))
    assert p.name == "proj1"
    assert p.api_key  # non-empty

    fetched = await repo.get_project(p.id)
    assert fetched is not None
    assert fetched.id == p.id


async def test_get_project_not_found(repo: PostgresReviewRepository):
    assert await repo.get_project(uuid.uuid4()) is None


async def test_get_project_by_api_key(repo: PostgresReviewRepository):
    p = await repo.create_project(ProjectCreate(name="proj2", repo_url="https://x.com/r"))
    fetched = await repo.get_project_by_api_key(p.api_key)
    assert fetched is not None
    assert fetched.id == p.id

    assert await repo.get_project_by_api_key("nonexistent") is None


async def test_list_projects(repo: PostgresReviewRepository):
    await repo.create_project(ProjectCreate(name="a", repo_url="u"))
    await repo.create_project(ProjectCreate(name="b", repo_url="u"))
    projects = await repo.list_projects()
    assert len(projects) == 2


async def test_create_review_with_findings(repo: PostgresReviewRepository):
    p = await repo.create_project(ProjectCreate(name="rp", repo_url="u"))
    review = await repo.create_review(
        p.id,
        ReviewCreate(
            commit_sha="abc123",
            branch="main",
            findings=[
                {
                    "file": "a.py",
                    "line": 10,
                    "rule": "no-eval",
                    "severity": "high",
                    "message": "bad",
                }
            ],
        ),
    )
    assert review.commit_sha == "abc123"
    assert len(review.findings) == 1
    assert review.findings[0].severity.value == "high"


async def test_get_review(repo: PostgresReviewRepository):
    p = await repo.create_project(ProjectCreate(name="rp2", repo_url="u"))
    created = await repo.create_review(
        p.id, ReviewCreate(commit_sha="def", branch="dev")
    )
    fetched = await repo.get_review(created.id)
    assert fetched is not None
    assert fetched.id == created.id


async def test_get_review_not_found(repo: PostgresReviewRepository):
    assert await repo.get_review(uuid.uuid4()) is None


async def test_list_reviews(repo: PostgresReviewRepository):
    p = await repo.create_project(ProjectCreate(name="rp3", repo_url="u"))
    await repo.create_review(p.id, ReviewCreate(commit_sha="a"))
    await repo.create_review(p.id, ReviewCreate(commit_sha="b"))
    reviews = await repo.list_reviews(p.id)
    assert len(reviews) == 2
    assert reviews[0].findings_count == 0


async def test_update_finding_status(repo: PostgresReviewRepository):
    p = await repo.create_project(ProjectCreate(name="rp4", repo_url="u"))
    review = await repo.create_review(
        p.id,
        ReviewCreate(
            commit_sha="xyz",
            findings=[
                {
                    "file": "b.py",
                    "line": 5,
                    "rule": "r",
                    "severity": "low",
                    "message": "m",
                }
            ],
        ),
    )
    fid = review.findings[0].id
    updated = await repo.update_finding_status(
        fid, FindingStatusUpdate(status=FindingStatus.FIXED)
    )
    assert updated is not None
    assert updated.status == FindingStatus.FIXED


async def test_update_finding_status_not_found(repo: PostgresReviewRepository):
    result = await repo.update_finding_status(
        uuid.uuid4(), FindingStatusUpdate(status=FindingStatus.ACKNOWLEDGED)
    )
    assert result is None
