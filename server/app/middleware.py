from __future__ import annotations

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("codeguard")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log every request with method, path, status, and duration."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        method = request.method
        path = request.url.path
        query = str(request.url.query)

        content_length = request.headers.get("content-length", "-")

        logger.info(
            ">>> %s %s%s | content-length=%s",
            method,
            path,
            f"?{query}" if query else "",
            content_length,
        )

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.exception("!!! %s %s | 500 | %.0fms", method, path, duration_ms)
            raise

        duration_ms = (time.perf_counter() - start) * 1000
        status = response.status_code

        if status >= 500:
            logger.error("<<< %s %s | %d | %.0fms", method, path, status, duration_ms)
        elif status >= 400:
            logger.warning("<<< %s %s | %d | %.0fms", method, path, status, duration_ms)
        else:
            logger.info("<<< %s %s | %d | %.0fms", method, path, status, duration_ms)

        return response
