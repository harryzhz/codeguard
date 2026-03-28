from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from .finding import FindingCreate, FindingResponse


class ReviewCreate(BaseModel):
    commit_sha: str = Field(..., min_length=1, max_length=255)
    branch: str = ""
    findings: list[FindingCreate] = Field(default_factory=list)


class ReviewResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    commit_sha: str
    branch: str
    findings_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewDetailResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    commit_sha: str
    branch: str
    findings: list[FindingResponse]
    created_at: datetime

    model_config = {"from_attributes": True}
