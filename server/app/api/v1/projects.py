from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_repository, resolve_project
from app.models import ProjectCreate, ProjectResponse
from app.storage.base import ReviewRepository

router = APIRouter(tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    repo: ReviewRepository = Depends(get_repository),
):
    existing = await repo.list_projects()
    if any(p.name == data.name for p in existing):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Project '{data.name}' already exists",
        )
    return await repo.create_project(data)


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    repo: ReviewRepository = Depends(get_repository),
):
    return await repo.list_projects()


@router.get("/{project_name}", response_model=ProjectResponse)
async def get_project(
    project: ProjectResponse = Depends(resolve_project),
):
    return project
