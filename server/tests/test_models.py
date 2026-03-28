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


# ── ProjectCreate ──

def test_project_create_valid():
    p = ProjectCreate(name="my-project")
    assert p.name == "my-project"


def test_project_create_empty_name():
    with pytest.raises(ValidationError):
        ProjectCreate(name="")


def test_project_create_invalid_name():
    with pytest.raises(ValidationError):
        ProjectCreate(name="bad name with spaces")


def test_project_create_valid_chars():
    p = ProjectCreate(name="my_project-123")
    assert p.name == "my_project-123"


# ── ProjectResponse ──

def test_project_response():
    now = datetime.now(timezone.utc)
    pr = ProjectResponse(
        id="abc123",
        name="p",
        created_at=now,
    )
    assert pr.id == "abc123"
    assert pr.name == "p"


# ── FindingCreate ──

def test_finding_create_valid():
    f = FindingCreate(
        severity="critical",
        confidence=0.95,
        title="Eval usage detected",
        description="Avoid eval",
        category="security",
        evidence_chain=[{"step": "found eval call"}],
        suggestion="Use ast.literal_eval instead",
    )
    assert f.test_verification is None
    assert f.confidence == 0.95


def test_finding_create_invalid_confidence():
    with pytest.raises(ValidationError):
        FindingCreate(
            severity="critical",
            confidence=1.5,
            title="t",
            description="d",
            category="logic",
            evidence_chain=[],
            suggestion="s",
        )


# ── FindingStatusUpdate ──

def test_finding_status_update():
    u = FindingStatusUpdate(status="accepted")
    assert u.status == "accepted"


def test_finding_status_update_invalid():
    with pytest.raises(ValidationError):
        FindingStatusUpdate(status="invalid")


# ── FindingResponse ──

def test_finding_response():
    now = datetime.now(timezone.utc)
    fr = FindingResponse(
        id="find-123",
        review_id="rev-456",
        severity="critical",
        confidence=0.9,
        title="Test finding",
        description="desc",
        category="logic",
        evidence_chain=[],
        test_verification=None,
        suggestion="fix it",
        status="open",
        created_at=now,
    )
    assert fr.status == "open"


# ── ReviewCreate ──

def test_review_create_valid():
    r = ReviewCreate(
        summary={"total": 1},
        files_changed=["x.py"],
        findings=[
            FindingCreate(
                severity="warning",
                confidence=0.8,
                title="Issue",
                description="desc",
                category="style",
                evidence_chain=[{"step": "found"}],
                suggestion="fix",
            )
        ],
    )
    assert len(r.findings) == 1


def test_review_create_defaults():
    r = ReviewCreate()
    assert r.summary == {}
    assert r.files_changed == []
    assert r.findings == []


# ── ReviewResponse ──

def test_review_response():
    now = datetime.now(timezone.utc)
    rr = ReviewResponse(
        id="rev-123",
        project_id="proj-456",
        version=1,
        title="Test review",
        summary={},
        files_changed=[],
        created_at=now,
    )
    assert rr.version == 1


# ── ReviewDetailResponse ──

def test_review_detail_response():
    now = datetime.now(timezone.utc)
    rd = ReviewDetailResponse(
        id="rev-123",
        project_id="proj-456",
        version=1,
        title="Test review",
        summary={},
        files_changed=[],
        findings=[],
        created_at=now,
    )
    assert rd.findings == []
