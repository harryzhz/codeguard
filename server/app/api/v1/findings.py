from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_repository
from app.models import FindingResponse, FindingStatusUpdate
from app.storage.base import ReviewRepository

router = APIRouter(prefix="/findings", tags=["findings"])


@router.patch("/{finding_id}", response_model=FindingResponse)
async def update_finding_status(
    finding_id: uuid.UUID,
    data: FindingStatusUpdate,
    repo: ReviewRepository = Depends(get_repository),
):
    result = await repo.update_finding_status(finding_id, data.status)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")
    return result
