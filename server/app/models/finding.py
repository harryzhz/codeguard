from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class FindingStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    FIXED = "fixed"
    FALSE_POSITIVE = "false_positive"


class FindingCreate(BaseModel):
    file: str
    line: int = Field(..., ge=1)
    rule: str
    severity: Severity
    message: str
    snippet: str = ""
    meta: dict[str, Any] = Field(default_factory=dict)


class FindingStatusUpdate(BaseModel):
    status: FindingStatus


class FindingResponse(BaseModel):
    id: uuid.UUID
    review_id: uuid.UUID
    file: str
    line: int
    rule: str
    severity: Severity
    message: str
    snippet: str
    meta: dict[str, Any]
    status: FindingStatus
    created_at: datetime

    model_config = {"from_attributes": True}
