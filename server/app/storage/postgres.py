from __future__ import annotations

import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.models import (
    FindingResponse,
    FindingStatusUpdate,
    ProjectCreate,
    ProjectResponse,
    ReviewCreate,
    ReviewDetailResponse,
    ReviewResponse,
)
from app.tables import FindingRow, ProjectRow, ReviewRow

from .base import ReviewRepository


class PostgresReviewRepository(ReviewRepository):
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._sf = session_factory

    # ── Projects ──

    async def create_project(self, data: ProjectCreate) -> ProjectResponse:
        async with self._sf() as session:
            row = ProjectRow(
                name=data.name,
                repo_url=data.repo_url,
                api_key=secrets.token_urlsafe(32),
            )
            session.add(row)
            await session.commit()
            await session.refresh(row)
            return ProjectResponse.model_validate(row)

    async def get_project(self, project_id: uuid.UUID) -> ProjectResponse | None:
        async with self._sf() as session:
            row = await session.get(ProjectRow, project_id)
            return ProjectResponse.model_validate(row) if row else None

    async def get_project_by_api_key(self, api_key: str) -> ProjectResponse | None:
        async with self._sf() as session:
            stmt = select(ProjectRow).where(ProjectRow.api_key == api_key)
            row = (await session.execute(stmt)).scalar_one_or_none()
            return ProjectResponse.model_validate(row) if row else None

    async def list_projects(self) -> list[ProjectResponse]:
        async with self._sf() as session:
            stmt = select(ProjectRow).order_by(ProjectRow.created_at)
            rows = (await session.execute(stmt)).scalars().all()
            return [ProjectResponse.model_validate(r) for r in rows]

    # ── Reviews ──

    async def create_review(
        self, project_id: uuid.UUID, data: ReviewCreate
    ) -> ReviewDetailResponse:
        async with self._sf() as session:
            review = ReviewRow(
                project_id=project_id,
                commit_sha=data.commit_sha,
                branch=data.branch,
            )
            session.add(review)
            await session.flush()

            for f in data.findings:
                finding = FindingRow(
                    review_id=review.id,
                    file=f.file,
                    line=f.line,
                    rule=f.rule,
                    severity=f.severity.value,
                    message=f.message,
                    snippet=f.snippet,
                    meta=f.meta,
                )
                session.add(finding)

            await session.commit()

            # reload with findings
            stmt = (
                select(ReviewRow)
                .options(selectinload(ReviewRow.findings))
                .where(ReviewRow.id == review.id)
            )
            review = (await session.execute(stmt)).scalar_one()
            return ReviewDetailResponse(
                id=review.id,
                project_id=review.project_id,
                commit_sha=review.commit_sha,
                branch=review.branch,
                findings=[FindingResponse.model_validate(f) for f in review.findings],
                created_at=review.created_at,
            )

    async def get_review(self, review_id: uuid.UUID) -> ReviewDetailResponse | None:
        async with self._sf() as session:
            stmt = (
                select(ReviewRow)
                .options(selectinload(ReviewRow.findings))
                .where(ReviewRow.id == review_id)
            )
            review = (await session.execute(stmt)).scalar_one_or_none()
            if not review:
                return None
            return ReviewDetailResponse(
                id=review.id,
                project_id=review.project_id,
                commit_sha=review.commit_sha,
                branch=review.branch,
                findings=[FindingResponse.model_validate(f) for f in review.findings],
                created_at=review.created_at,
            )

    async def list_reviews(self, project_id: uuid.UUID) -> list[ReviewResponse]:
        async with self._sf() as session:
            stmt = (
                select(ReviewRow)
                .options(selectinload(ReviewRow.findings))
                .where(ReviewRow.project_id == project_id)
                .order_by(ReviewRow.created_at)
            )
            rows = (await session.execute(stmt)).scalars().all()
            return [
                ReviewResponse(
                    id=r.id,
                    project_id=r.project_id,
                    commit_sha=r.commit_sha,
                    branch=r.branch,
                    findings_count=len(r.findings),
                    created_at=r.created_at,
                )
                for r in rows
            ]

    # ── Findings ──

    async def update_finding_status(
        self, finding_id: uuid.UUID, data: FindingStatusUpdate
    ) -> FindingResponse | None:
        async with self._sf() as session:
            row = await session.get(FindingRow, finding_id)
            if not row:
                return None
            row.status = data.status.value
            await session.commit()
            await session.refresh(row)
            return FindingResponse.model_validate(row)
