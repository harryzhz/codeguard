from __future__ import annotations

from typing import Any

from .base import VCSAdapter


class GitLabAdapter(VCSAdapter):
    """Stub GitLab VCS adapter – to be implemented with python-gitlab or REST API."""

    def __init__(self, base_url: str = "https://gitlab.com", token: str = "") -> None:
        self.base_url = base_url
        self.token = token

    async def post_inline_comment(
        self,
        repo: str,
        merge_request_id: int,
        file: str,
        line: int,
        body: str,
    ) -> dict[str, Any]:
        raise NotImplementedError("GitLab inline comment not yet implemented")

    async def set_commit_status(
        self,
        repo: str,
        commit_sha: str,
        state: str,
        description: str,
    ) -> dict[str, Any]:
        raise NotImplementedError("GitLab commit status not yet implemented")

    async def get_diff(
        self,
        repo: str,
        merge_request_id: int,
    ) -> str:
        raise NotImplementedError("GitLab diff retrieval not yet implemented")
