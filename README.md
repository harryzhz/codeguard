# CodeGuard

AI-powered code review agent for Claude Code. Automatically reviews your code changes after every task, producing evidence-backed findings with confidence scores.

## Features

- **Zero context switch** — runs inside Claude Code as a plugin
- **Evidence-backed findings** — every finding includes a step-by-step evidence chain tracing through the code
- **Test-aware** — runs your test suite and correlates results with findings
- **Confidence scores** — each finding has a severity (critical/warning/style) and confidence level
- **Web dashboard** — browse review reports with filtering, evidence chains, and accept/dismiss actions

## Architecture

```
Claude Code Session
├── Main Agent (your tasks)
└── ReviewAgent (auto-triggered after task completion)
    ├── Reads changed files
    ├── Runs tests
    ├── Applies review skills (general, security, performance)
    └── Outputs structured JSON → uploads to Server

Server (FastAPI)          Web UI (React)
├── REST API              ├── Project list
├── PostgreSQL/SQLite     ├── Review list
└── API Key auth          └── Review detail with evidence chains
```

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/harryzhz/codeguard.git
cd codeguard
cp .env.example .env
# Edit .env: set CODEGUARD_API_KEY to a random secret
```

### 2. Start services

```bash
docker compose up -d
```

This starts:
- PostgreSQL database (port 5432)
- CodeGuard Server API (port 8000)
- CodeGuard Web UI (port 80)

### 3. Create a project

```bash
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "my-project"}'
```

### 4. Install the plugin

```bash
cd /path/to/your/project
claude --plugin-dir /path/to/codeguard/codeguard-plugin
```

Set environment variables before starting Claude Code:

```bash
export CODEGUARD_SERVER=http://localhost:8000
export CODEGUARD_API_KEY=<same key as in .env>
```

### 5. Run a review

In Claude Code, run:

```
/codeguard:review
```

This reviews all uncommitted changes and uploads the report to the server.

### 6. View results

Open http://localhost in your browser to see the web dashboard.

Navigate: Projects → your project → Reviews → click a review to see findings with evidence chains.

## Local Development (without Docker)

### Server

```bash
cd server
pip install -e ".[dev]"
DATABASE_URL="sqlite+aiosqlite:///codeguard.db" uvicorn app.main:create_app --factory --reload --port 8000
```

### Web UI

```bash
cd web
npm install
npm run dev  # starts on port 5173 with API proxy to localhost:8000
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects` | List projects |
| GET | `/api/v1/projects/{name}` | Get project by name |
| POST | `/api/v1/projects/{name}/reviews` | Upload review (requires API key) |
| GET | `/api/v1/projects/{name}/reviews` | List reviews |
| GET | `/api/v1/projects/{name}/reviews/{id}` | Get review with findings |
| PATCH | `/api/v1/findings/{id}` | Update finding status (accepted/dismissed) |

## Tech Stack

- **Plugin**: Claude Code Plugin SDK (Markdown + JSON + Bash)
- **Server**: Python 3.12, FastAPI, SQLAlchemy (async), PostgreSQL/SQLite
- **Web**: React 18, TypeScript, Vite, React Router

## License

MIT
