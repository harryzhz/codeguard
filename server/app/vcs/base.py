from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class VCSAdapter(ABC):
    """Abstract interface for version-control system integrations."""

    @abstractmethod
    async def post_inline_comment(
        self,
        repo: str,
        merge_request_id: int,
        file: str,
        line: int,
        body: str,
    ) -> dict[str, Any]:
        """Post an inline comment on a merge/pull request."""
        ...

    @abstractmethod
    async def set_commit_status(
        self,
        repo: str,
        commit_sha: str,
        state: str,
        description: str,
    ) -> dict[str, Any]:
        """Set a commit status (e.g. pending, success, failure)."""
        ...

    @abstractmethod
    async def get_diff(
        self,
        repo: str,
        merge_request_id: int,
    ) -> str:
        """Retrieve the diff for a merge/pull request."""
        ...
