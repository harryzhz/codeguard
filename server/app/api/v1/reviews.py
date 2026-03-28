from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_repository, verify_api_key
from app.models import (
    ProjectResponse,
    ReviewCreate,
    ReviewDetailResponse,
    ReviewResponse,
)
from app.storage.base import ReviewRepository

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("/", response_model=ReviewDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    data: ReviewCreate,
    project: ProjectResponse = Depends(verify_api_key),
    repo: ReviewRepository = Depends(get_repository),
):
    return await repo.create_review(project.id, data)


@router.get("/", response_model=list[ReviewResponse])
async def list_reviews(
    project_id: uuid.UUID,
    repo: ReviewRepository = Depends(get_repository),
):
    return await repo.list_reviews(project_id)


@router.get("/{review_id}", response_model=ReviewDetailResponse)
async def get_review(
    review_id: uuid.UUID,
    repo: ReviewRepository = Depends(get_repository),
):
    review = await repo.get_review(review_id)
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return review
