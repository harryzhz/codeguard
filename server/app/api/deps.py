import secrets
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import Settings
from app.models import ProjectCreate, ProjectResponse
from app.storage.base import ReviewRepository

_repo = None
_bearer = HTTPBearer(auto_error=False)

def set_repository(repo):
    global _repo
    _repo = repo

def get_repository():
    if _repo is None:
        raise RuntimeError("Repository not initialized")
    return _repo

@lru_cache
def get_settings() -> Settings:
    return Settings()

async def verify_api_key(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
):
    """Verify global API key. Skip if CODEGUARD_API_KEY is not configured."""
    settings = get_settings()
    if not settings.CODEGUARD_API_KEY:
        return  # No key configured = open access (local dev)
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    if not secrets.compare_digest(credentials.credentials, settings.CODEGUARD_API_KEY):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

async def resolve_project(
    project_name: str,
    repo: ReviewRepository = Depends(get_repository),
) -> ProjectResponse:
    project = await repo.get_project_by_name(project_name)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


async def resolve_or_create_project(
    project_name: str,
    repo: ReviewRepository = Depends(get_repository),
) -> ProjectResponse:
    project = await repo.get_project_by_name(project_name)
    if project is None:
        project = await repo.create_project(ProjectCreate(name=project_name))
    return project
