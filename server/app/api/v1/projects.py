from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_repository
from app.models import ProjectCreate, ProjectResponse
from app.storage.base import ReviewRepository

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
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


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(
    repo: ReviewRepository = Depends(get_repository),
):
    return await repo.list_projects()


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    repo: ReviewRepository = Depends(get_repository),
):
    project = await repo.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project
