# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CodeGuard is an AI-powered code review system with three components:
- **Server** (Python/FastAPI) — REST API storing reviews in PostgreSQL/SQLite
- **Web** (React/Vite/TypeScript) — Dashboard for browsing review reports
- **Plugin** (Claude Code Plugin) — Sub-agent that reviews code changes after task completion

## Common Commands

```bash
# Development (via Makefile)
make server              # Start API server on port 9527 (SQLite)
make web                 # Start web dev server on port 3014
make dev                 # Start both in background
make stop                # Stop all

# Testing
make test                # Run all tests
make test-server         # pytest only
make test-web            # vitest only

# Run single test
cd server && python -m pytest tests/test_reviews.py -x -q
cd web && npx vitest run tests/components/FindingCard.test.tsx

# Docker
make up / make down      # docker-compose (PostgreSQL + Server + Web)
```

## Architecture

### Server (`server/app/`)

FastAPI app created via factory pattern in `main.py:create_app()`. API routes live under `api/v1/` with dependency injection in `api/deps.py`.

**Data flow**: API routes → `deps.py` (auth, project resolution) → `storage/postgres.py` (PostgresReviewRepository) → `tables.py` (SQLAlchemy ORM)

Key design decisions:
- `resolve_project` returns 404 for GET requests; `resolve_or_create_project` auto-creates for POST review uploads
- Single global API key auth (skipped if `CODEGUARD_API_KEY` is unset)
- IDs are 12-char short IDs (`utils.generate_short_id`)
- Review versions auto-increment per project via `SELECT MAX(version) + 1`
- Tests use in-memory SQLite (`conftest.py` creates fresh DB per test)

### Web (`web/src/`)

React SPA with React Router. Routes: `/projects` → `/projects/:name/reviews` → `/projects/:name/reviews/:version`.

- `api/client.ts` — fetch wrapper, all type definitions
- `components/CodeBlock.tsx` — Shiki syntax highlighting (github-light theme)
- `components/FindingCard.tsx` — Expandable finding with evidence chain, inline code rendering in suggestions
- Vite proxies `/api` → `http://127.0.0.1:9527`

### Plugin (`codeguard-plugin/`)

Plugin lifecycle: task stops → `Stop` hook launches review-agent → agent reviews code with 4 skills (general, security, performance, output-format) → saves `.codeguard/last-review.json` → `SubagentStop` hook runs `upload-result.sh` to POST results to server.

## Rules

- 修改代码后，如果改动影响了 API 端点、配置项、使用方式或架构等用户可见行为，需同步更新 `README.md`。

## Configuration

Copy `.env.example` to `.env`. Key variables:
- `DATABASE_URL` — PostgreSQL or SQLite connection string
- `CODEGUARD_API_KEY` — Shared secret for review uploads
- `CODEGUARD_SERVER` — Server base URL (used by plugin upload script)
