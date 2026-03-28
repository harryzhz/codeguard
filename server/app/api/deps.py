from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models import ProjectResponse
from app.storage.base import ReviewRepository

_repo: ReviewRepository | None = None
_bearer = HTTPBearer()


def set_repository(repo: ReviewRepository) -> None:
    global _repo
    _repo = repo


def get_repository() -> ReviewRepository:
    assert _repo is not None, "Repository not initialised"
    return _repo


async def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    repo: ReviewRepository = Depends(get_repository),
) -> ProjectResponse:
    project = await repo.get_project_by_api_key(credentials.credentials)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    return project
