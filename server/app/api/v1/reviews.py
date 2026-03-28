from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_repository, verify_api_key, resolve_project
from app.models import (
    ProjectResponse,
    ReviewCreate,
    ReviewDetailResponse,
    ReviewResponse,
)
from app.storage.base import ReviewRepository

router = APIRouter(tags=["reviews"])


@router.post("/projects/{project_name}/reviews", response_model=ReviewDetailResponse, status_code=201)
async def create_review(
    project_name: str,
    data: ReviewCreate,
    _auth=Depends(verify_api_key),
    project: ProjectResponse = Depends(resolve_project),
    repo: ReviewRepository = Depends(get_repository),
):
    return await repo.create_review(project.id, data)


@router.get("/projects/{project_name}/reviews", response_model=list[ReviewResponse])
async def list_reviews(
    project: ProjectResponse = Depends(resolve_project),
    repo: ReviewRepository = Depends(get_repository),
):
    return await repo.list_reviews(project.id)


@router.get("/projects/{project_name}/reviews/{review_id}", response_model=ReviewDetailResponse)
async def get_review(
    review_id: str,
    repo: ReviewRepository = Depends(get_repository),
):
    review = await repo.get_review(review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    return review
