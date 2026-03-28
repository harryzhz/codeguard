from __future__ import annotations

import uuid
from abc import ABC, abstractmethod

from app.models import (
    FindingResponse,
    FindingStatusUpdate,
    ProjectCreate,
    ProjectResponse,
    ReviewCreate,
    ReviewDetailResponse,
    ReviewResponse,
)


class ReviewRepository(ABC):

    # ── Projects ──

    @abstractmethod
    async def create_project(self, data: ProjectCreate) -> ProjectResponse:
        ...

    @abstractmethod
    async def get_project(self, project_id: uuid.UUID) -> ProjectResponse | None:
        ...

    @abstractmethod
    async def get_project_by_api_key(self, api_key: str) -> ProjectResponse | None:
        ...

    @abstractmethod
    async def list_projects(self) -> list[ProjectResponse]:
        ...

    # ── Reviews ──

    @abstractmethod
    async def create_review(
        self, project_id: uuid.UUID, data: ReviewCreate
    ) -> ReviewDetailResponse:
        ...

    @abstractmethod
    async def get_review(self, review_id: uuid.UUID) -> ReviewDetailResponse | None:
        ...

    @abstractmethod
    async def list_reviews(self, project_id: uuid.UUID) -> list[ReviewResponse]:
        ...

    # ── Findings ──

    @abstractmethod
    async def update_finding_status(
        self, finding_id: uuid.UUID, data: FindingStatusUpdate
    ) -> FindingResponse | None:
        ...
