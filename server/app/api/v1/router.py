from fastapi import APIRouter

from .findings import router as findings_router
from .projects import router as projects_router
from .reviews import router as reviews_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(projects_router)
api_router.include_router(reviews_router)
api_router.include_router(findings_router)
