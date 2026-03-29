from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import get_repository, verify_api_key, resolve_project, resolve_or_create_project
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
    project: ProjectResponse = Depends(resolve_or_create_project),
    repo: ReviewRepository = Depends(get_repository),
):
    return await repo.create_review(project.id, data)


@router.get("/projects/{project_name}/reviews", response_model=list[ReviewResponse])
async def list_reviews(
    project: ProjectResponse = Depends(resolve_project),
    repo: ReviewRepository = Depends(get_repository),
):
    return await repo.list_reviews(project.id)


@router.get("/projects/{project_name}/reviews/{version}", response_model=ReviewDetailResponse)
async def get_review(
    version: int,
    project: ProjectResponse = Depends(resolve_project),
    repo: ReviewRepository = Depends(get_repository),
):
    review = await repo.get_review_by_version(project.id, version)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.delete("/projects/{project_name}/reviews/{version}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    version: int,
    _auth=Depends(verify_api_key),
    project: ProjectResponse = Depends(resolve_project),
    repo: ReviewRepository = Depends(get_repository),
):
    review = await repo.get_review_by_version(project.id, version)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    await repo.delete_review(review.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
