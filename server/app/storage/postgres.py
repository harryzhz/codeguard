from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.models import (
    FindingResponse,
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
            row = ProjectRow(name=data.name)
            session.add(row)
            await session.commit()
            await session.refresh(row)
            return ProjectResponse.model_validate(row)

    async def get_project(self, project_id: str) -> ProjectResponse | None:
        async with self._sf() as session:
            row = await session.get(ProjectRow, project_id)
            return ProjectResponse.model_validate(row) if row else None

    async def get_project_by_name(self, name: str) -> ProjectResponse | None:
        async with self._sf() as session:
            stmt = select(ProjectRow).where(ProjectRow.name == name)
            row = (await session.execute(stmt)).scalar_one_or_none()
            return ProjectResponse.model_validate(row) if row else None

    async def list_projects(self) -> list[ProjectResponse]:
        async with self._sf() as session:
            stmt = select(ProjectRow).order_by(ProjectRow.created_at)
            rows = (await session.execute(stmt)).scalars().all()
            return [ProjectResponse.model_validate(r) for r in rows]

    async def delete_project(self, project_id: str) -> bool:
        async with self._sf() as session:
            row = await session.get(ProjectRow, project_id)
            if not row:
                return False
            await session.delete(row)
            await session.commit()
            return True

    # ── Reviews ──

    async def create_review(
        self, project_id: str, data: ReviewCreate
    ) -> ReviewDetailResponse:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with self._sf() as session:
                    # Auto-increment version per project
                    stmt = select(func.coalesce(func.max(ReviewRow.version), 0)).where(
                        ReviewRow.project_id == project_id
                    )
                    max_version = (await session.execute(stmt)).scalar_one()
                    review = ReviewRow(
                        project_id=project_id,
                        version=max_version + 1,
                        title=data.title,
                        summary=data.summary,
                        files_changed=data.files_changed,
                    )
                    session.add(review)
                    await session.flush()

                    for f in data.findings:
                        finding = FindingRow(
                            review_id=review.id,
                            severity=f.severity,
                            confidence=f.confidence,
                            title=f.title,
                            description=f.description,
                            category=f.category,
                            evidence_chain=f.evidence_chain,
                            test_verification=f.test_verification,
                            suggestion=f.suggestion,
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
                        version=review.version,
                        title=review.title,
                        summary=review.summary,
                        files_changed=review.files_changed,
                        findings=[FindingResponse.model_validate(f) for f in review.findings],
                        created_at=review.created_at,
                    )
            except IntegrityError:
                if attempt == max_retries - 1:
                    raise
                continue

    async def get_review_by_version(
        self, project_id: str, version: int
    ) -> ReviewDetailResponse | None:
        async with self._sf() as session:
            stmt = (
                select(ReviewRow)
                .options(selectinload(ReviewRow.findings))
                .where(ReviewRow.project_id == project_id, ReviewRow.version == version)
            )
            review = (await session.execute(stmt)).scalar_one_or_none()
            if not review:
                return None
            return ReviewDetailResponse(
                id=review.id,
                project_id=review.project_id,
                version=review.version,
                title=review.title,
                summary=review.summary,
                files_changed=review.files_changed,
                findings=[FindingResponse.model_validate(f) for f in review.findings],
                created_at=review.created_at,
            )

    async def list_reviews(self, project_id: str) -> list[ReviewResponse]:
        async with self._sf() as session:
            stmt = (
                select(ReviewRow)
                .where(ReviewRow.project_id == project_id)
                .order_by(ReviewRow.created_at)
            )
            rows = (await session.execute(stmt)).scalars().all()
            return [
                ReviewResponse(
                    id=r.id,
                    project_id=r.project_id,
                    version=r.version,
                    title=r.title,
                    summary=r.summary,
                    files_changed=r.files_changed,
                    created_at=r.created_at,
                )
                for r in rows
            ]

    async def delete_review(self, review_id: str) -> bool:
        async with self._sf() as session:
            row = await session.get(ReviewRow, review_id)
            if not row:
                return False
            await session.delete(row)
            await session.commit()
            return True

    # ── Findings ──

    async def update_finding_status(
        self, finding_id: str, status: str
    ) -> FindingResponse | None:
        async with self._sf() as session:
            row = await session.get(FindingRow, finding_id)
            if not row:
                return None
            row.status = status
            await session.commit()
            await session.refresh(row)
            return FindingResponse.model_validate(row)
