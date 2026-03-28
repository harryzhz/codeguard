from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    repo_url: str = Field(..., min_length=1)


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    repo_url: str
    api_key: str
    created_at: datetime

    model_config = {"from_attributes": True}
