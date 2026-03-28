from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field
from .finding import FindingCreate, FindingResponse

class ReviewCreate(BaseModel):
    version: str = Field(default="1.0")
    summary: dict[str, Any] = Field(default_factory=dict)
    files_changed: list[str] = Field(default_factory=list)
    findings: list[FindingCreate] = Field(default_factory=list)

class ReviewResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    version: str
    summary: dict[str, Any]
    files_changed: list[str]
    created_at: datetime
    model_config = {"from_attributes": True}

class ReviewDetailResponse(ReviewResponse):
    findings: list[FindingResponse] = Field(default_factory=list)
