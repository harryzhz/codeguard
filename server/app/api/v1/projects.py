from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import get_repository, resolve_project, verify_api_key
from app.models import ProjectCreate, ProjectResponse
from app.storage.base import ReviewRepository

router = APIRouter(tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    repo: ReviewRepository = Depends(get_repository),
):
    existing = await repo.get_project_by_name(data.name)
    if existing:
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


@router.delete("/{project_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    _auth=Depends(verify_api_key),
    project: ProjectResponse = Depends(resolve_project),
    repo: ReviewRepository = Depends(get_repository),
):
    await repo.delete_project(project.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
