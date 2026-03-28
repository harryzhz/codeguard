import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.models import (
    FindingCreate,
    FindingResponse,
    FindingStatusUpdate,
    ProjectCreate,
    ProjectResponse,
    ReviewCreate,
    ReviewDetailResponse,
    ReviewResponse,
)
from app.models.finding import FindingStatus, Severity


# ── ProjectCreate ──

def test_project_create_valid():
    p = ProjectCreate(name="my-project", repo_url="https://gitlab.com/repo")
    assert p.name == "my-project"


def test_project_create_empty_name():
    with pytest.raises(ValidationError):
        ProjectCreate(name="", repo_url="https://gitlab.com/repo")


# ── ProjectResponse ──

def test_project_response():
    now = datetime.now(timezone.utc)
    pr = ProjectResponse(
        id=uuid.uuid4(),
        name="p",
        repo_url="https://x.com",
        api_key="key-123",
        created_at=now,
    )
    assert pr.api_key == "key-123"


# ── FindingCreate ──

def test_finding_create_valid():
    f = FindingCreate(
        file="main.py",
        line=10,
        rule="no-eval",
        severity=Severity.HIGH,
        message="Avoid eval",
    )
    assert f.snippet == ""
    assert f.meta == {}


def test_finding_create_invalid_line():
    with pytest.raises(ValidationError):
        FindingCreate(
            file="a.py", line=0, rule="r", severity="high", message="m"
        )


# ── FindingStatusUpdate ──

def test_finding_status_update():
    u = FindingStatusUpdate(status=FindingStatus.FIXED)
    assert u.status == FindingStatus.FIXED


def test_finding_status_update_invalid():
    with pytest.raises(ValidationError):
        FindingStatusUpdate(status="invalid")


# ── FindingResponse ──

def test_finding_response():
    now = datetime.now(timezone.utc)
    fr = FindingResponse(
        id=uuid.uuid4(),
        review_id=uuid.uuid4(),
        file="a.py",
        line=1,
        rule="r",
        severity=Severity.LOW,
        message="m",
        snippet="",
        meta={},
        status=FindingStatus.OPEN,
        created_at=now,
    )
    assert fr.status == FindingStatus.OPEN


# ── ReviewCreate ──

def test_review_create_valid():
    r = ReviewCreate(
        commit_sha="abc123",
        branch="main",
        findings=[
            FindingCreate(
                file="x.py", line=1, rule="r", severity="low", message="m"
            )
        ],
    )
    assert len(r.findings) == 1


def test_review_create_empty_sha():
    with pytest.raises(ValidationError):
        ReviewCreate(commit_sha="")


# ── ReviewResponse ──

def test_review_response():
    now = datetime.now(timezone.utc)
    rr = ReviewResponse(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        commit_sha="abc",
        branch="main",
        findings_count=3,
        created_at=now,
    )
    assert rr.findings_count == 3


# ── ReviewDetailResponse ──

def test_review_detail_response():
    now = datetime.now(timezone.utc)
    rd = ReviewDetailResponse(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        commit_sha="abc",
        branch="main",
        findings=[],
        created_at=now,
    )
    assert rd.findings == []
