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

### Server (Python/FastAPI)

**代码风格**
- 文件头必须加 `from __future__ import annotations`
- Pydantic 模型区分 Create 和 Response 两类，Response 模型加 `model_config = {"from_attributes": True}` 以支持 ORM 转换
- 字段约束用 `Field()` 声明（`min_length`, `max_length`, `pattern`, `ge`, `le`），枚举用 `Literal` 类型
- 可变默认值使用 `Field(default_factory=list)` / `Field(default_factory=dict)`

**API 路由**
- 路由按资源拆分文件（`projects.py`, `reviews.py`, `findings.py`），通过 `api/v1/router.py` 统一注册
- 写操作（POST/PATCH/DELETE）须加 `Depends(verify_api_key)` 鉴权，GET 无需鉴权
- 资源解析用 `resolve_project`（GET 场景，不存在返回 404）或 `resolve_or_create_project`（POST 场景，自动创建）
- 状态码：POST 返回 201，DELETE 返回 204（`Response(status_code=...)`），冲突返回 409

**数据库 & ORM**
- 使用 SQLAlchemy 2.0+ async 模式，字段用 `Mapped[]` 类型注解
- 关联关系用 `back_populates` + `cascade="all, delete-orphan"`
- ID 由 `utils.generate_short_id()` 生成（10 字符 URL-safe），时间戳用 `datetime.now(timezone.utc)`
- 需要加载关联数据时使用 `selectinload`

**测试**
- 测试文件顶部声明 `pytestmark = pytest.mark.asyncio`
- 使用 `conftest.py` 中的 fixture 链：engine → session_factory → repo → app → client（内存 SQLite）
- 命名格式：`test_<功能>_<场景>`，如 `test_create_project_duplicate`

### Web (React/TypeScript)

**组件规范**
- 只使用函数组件 + Hooks，不使用 class 组件
- Props 类型以 `interface` 定义在组件上方
- 组件使用命名导出：`export function ComponentName() {}`
- 所有可交互元素必须加 `data-testid` 属性
- 类型导入使用 `import type { Finding }` 语法

**样式**
- 使用内联样式（inline styles），不使用 CSS Modules 或 styled-components
- 设计 token 定义在 `index.css` 的 CSS 变量中（`--primary`, `--critical`, `--radius-card` 等）
- 字体统一使用 DM Sans

**状态管理**
- 使用 `useState` 管理本地状态，不引入外部状态库
- 数据获取：`useEffect` + `fetch().then().catch().finally()` 模式
- 页面维护独立的 `loading` / `error` 状态

**API 调用**
- 所有类型定义和请求函数统一放在 `api/client.ts`
- 使用泛型 `request<T>()` 封装请求，错误抛出 `ApiError`（含 `status` 属性）
- 无 body 的响应（如 DELETE 204）不调用 `response.json()`

**测试**
- 使用 Vitest + React Testing Library + jsdom 环境
- API 模块用 `vi.mock()` 整体 mock，回调用 `vi.fn()`
- 页面组件渲染需包裹 `MemoryRouter`
- 用户交互用 `userEvent.setup()`，异步断言用 `waitFor()`

## Configuration

Copy `.env.example` to `.env`. Key variables:
- `DATABASE_URL` — PostgreSQL or SQLite connection string
- `CODEGUARD_API_KEY` — Shared secret for review uploads
- `CODEGUARD_SERVER` — Server base URL (used by plugin upload script)
