# CodeGuard 系统设计文档

## 概述

CodeGuard 是一个 Claude Code 插件，在 Claude Code 完成任务后自动运行 ReviewAgent 进行代码审查，产出结构化的 review 报告，通过 Web UI 可视化展示。

系统分为三大模块：**Plugin**（Claude Code 插件）、**Server**（FastAPI 后端）、**Web**（React 前端）。

---

## 1. Plugin 模块

### 目录结构

```
codeguard-plugin/
├── .claude-plugin/
│   └── plugin.json              # 插件清单（metadata）
├── agents/
│   └── review-agent.md          # ReviewAgent Sub Agent 定义
├── skills/
│   ├── general-review/SKILL.md  # 通用代码质量审查
│   ├── security-review/SKILL.md # 安全审查
│   ├── performance-review/SKILL.md # 性能审查
│   └── output-format/SKILL.md   # JSON 输出格式规范
├── commands/
│   └── review.md                # /codeguard:review 手动触发命令
├── hooks/
│   ├── hooks.json               # Hook 事件配置
│   └── scripts/
│       └── upload-result.sh     # 上传 review JSON 到 Server
└── settings.json                # 默认设置
```

### 核心流程

1. **自动触发**：Main Agent 完成任务 → `Stop` Hook 触发 → 启动 ReviewAgent
2. **手动触发**：用户执行 `/codeguard:review` → 启动 ReviewAgent
3. ReviewAgent 加载 skills，读取项目上下文，执行审查
4. ReviewAgent 输出结构化 JSON → `SubagentStop` Hook 触发 → `upload-result.sh` POST 到 Server
5. 终端打印一行摘要 + report 链接

### 自动触发 vs 手动触发

| 维度 | 自动触发（Hook） | 手动触发（/codeguard:review） |
|------|------------------|-------------------------------|
| 审查范围 | 本次任务变更的文件 | 当前所有未提交的变更（git diff） |
| 触发方式 | 任务完成自动执行 | 用户主动调用 |

### ReviewAgent JSON 输出 Schema

```json
{
  "version": "1.0",
  "project": "project-name",
  "review_id": "uuid",
  "timestamp": "ISO8601",
  "summary": {
    "files_reviewed": 5,
    "total_findings": 3,
    "critical": 1,
    "warning": 1,
    "style": 1,
    "tests_run": true,
    "tests_passed": 12,
    "tests_failed": 1
  },
  "files_changed": ["src/auth.py", "src/db.py"],
  "findings": [
    {
      "id": "finding-uuid",
      "severity": "critical | warning | style",
      "confidence": 0.95,
      "title": "一行描述",
      "description": "详细说明",
      "category": "logic | security | performance | style",
      "evidence_chain": [
        {
          "step": 1,
          "file": "src/payment.py",
          "line": 42,
          "snippet": "代码片段",
          "observation": "该步骤的观察"
        }
      ],
      "test_verification": {
        "status": "passed | failed | no_coverage",
        "test_name": "test_concurrent_deduction",
        "output": "测试输出"
      },
      "suggestion": "修复建议"
    }
  ]
}
```

### Review Skills

- **general-review**：逻辑错误、边界条件、错误处理、资源清理、命名清晰度
- **security-review**：SQL 注入、认证绕过、敏感信息暴露、输入校验、SSRF，追踪数据流
- **performance-review**：N+1 查询、无限循环、缺失分页、大内存分配、异步代码中的阻塞 I/O
- **output-format**：定义 JSON 输出格式规范，确保 ReviewAgent 产出结构化数据

---

## 2. Server 模块

### 目录结构

```
server/
├── app/
│   ├── main.py                  # FastAPI 入口
│   ├── config.py                # 配置管理（环境变量）
│   ├── api/
│   │   ├── v1/
│   │   │   ├── router.py        # v1 路由聚合
│   │   │   ├── projects.py      # 项目 CRUD
│   │   │   ├── reviews.py       # Review 上传/查询
│   │   │   └── findings.py      # Finding 详情/状态更新
│   │   ├── deps.py              # 依赖注入（认证、DB session）
│   │   └── middleware.py        # API Key 认证中间件
│   ├── models/
│   │   ├── project.py           # Project 领域模型
│   │   ├── review.py            # Review 领域模型
│   │   └── finding.py           # Finding 领域模型
│   ├── storage/
│   │   ├── base.py              # ReviewRepository 抽象接口（ABC）
│   │   ├── sqlite.py            # SqliteReviewRepository
│   │   └── postgres.py          # PostgresReviewRepository
│   └── vcs/
│       ├── base.py              # VCSAdapter 抽象接口（ABC，预留）
│       └── gitlab.py            # GitLab 适配器（预留）
├── migrations/                  # Alembic 数据库迁移
├── tests/
├── Dockerfile
├── pyproject.toml
└── .env.example
```

### 存储层抽象

```python
class ReviewRepository(ABC):
    # Project
    async def create_project(self, project: Project) -> Project: ...
    async def get_project(self, project_id: str) -> Project | None: ...
    async def list_projects(self) -> list[Project]: ...

    # Review
    async def create_review(self, review: Review) -> Review: ...
    async def get_review(self, review_id: str) -> Review | None: ...
    async def list_reviews(self, project_id: str) -> list[Review]: ...

    # Finding
    async def create_findings(self, findings: list[Finding]) -> list[Finding]: ...
    async def update_finding_status(self, finding_id: str, status: str) -> Finding: ...
```

实现类：`SqliteReviewRepository`、`PostgresReviewRepository`。通过环境变量 `STORAGE_BACKEND=sqlite|postgres` 切换，依赖注入在 `deps.py` 中完成，API 层不感知具体存储。

### VCS 扩展预留

```python
class VCSAdapter(ABC):
    async def post_review_comment(self, review: Review) -> None: ...
    async def get_merge_request(self, mr_id: str) -> dict: ...
```

后续实现 GitLab、GitHub、Bitbucket 适配器，通过配置切换。MVP 不实现。

### API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/projects` | 创建项目 |
| GET | `/api/v1/projects` | 项目列表 |
| GET | `/api/v1/projects/{id}` | 项目详情 |
| POST | `/api/v1/projects/{id}/reviews` | 上传 review 结果（Plugin 调用） |
| GET | `/api/v1/projects/{id}/reviews` | Review 列表 |
| GET | `/api/v1/projects/{id}/reviews/{rid}` | Review 详情（含 findings） |
| PATCH | `/api/v1/findings/{fid}` | 更新 finding 状态（accept/dismiss） |

### 认证

所有 API 请求需要 `Authorization: Bearer {API_KEY}` header。一个项目对应一个 API Key，在 Server 侧配置。

### 数据库 Schema

**projects**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR | 项目名称（唯一） |
| api_key | VARCHAR | 项目 API Key |
| created_at | TIMESTAMP | 创建时间 |

**reviews**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| project_id | UUID | 外键 → projects |
| version | VARCHAR | schema 版本 |
| summary | JSON | 审查摘要 |
| files_changed | JSON | 变更文件列表 |
| created_at | TIMESTAMP | 创建时间 |

**findings**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| review_id | UUID | 外键 → reviews |
| severity | VARCHAR | critical/warning/style |
| confidence | FLOAT | 置信度 0-1 |
| title | VARCHAR | 标题 |
| description | TEXT | 详细描述 |
| category | VARCHAR | logic/security/performance/style |
| evidence_chain | JSON | 证据链 |
| test_verification | JSON | 测试验证结果 |
| suggestion | TEXT | 修复建议 |
| status | VARCHAR | open/accepted/dismissed（默认 open） |
| created_at | TIMESTAMP | 创建时间 |

---

## 3. Web 模块

### 目录结构

```
web/
├── src/
│   ├── api/
│   │   └── client.ts            # API 客户端（封装 fetch）
│   ├── components/
│   │   ├── SeverityBadge.tsx     # 严重度标签
│   │   ├── EvidenceChain.tsx     # 证据链展示
│   │   ├── FindingCard.tsx       # Finding 卡片（展开/收起）
│   │   ├── SummaryBar.tsx        # 审查概览栏
│   │   └── SeverityFilter.tsx    # 严重度筛选器
│   ├── pages/
│   │   ├── ProjectList.tsx       # /projects
│   │   ├── ReviewList.tsx        # /projects/{id}/reviews
│   │   └── ReviewDetail.tsx      # /projects/{id}/reviews/{rid}
│   ├── router.tsx                # React Router 路由配置
│   └── main.tsx                  # 入口
├── Dockerfile                    # 多阶段构建（build + nginx）
├── nginx.conf                    # Nginx 配置（serve 静态 + 反代 API）
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 页面设计

**项目列表页 `/projects`**
- 卡片式列表，每个项目显示名称、最近审查时间、总审查次数、severity 分布 badges

**Review 列表页 `/projects/{id}/reviews`**
- 面包屑导航
- 卡片式列表，每条 review 显示 ID、时间、文件数、测试结果、severity 分布

**Review 详情页 `/projects/{id}/reviews/{rid}`**
- Summary bar：文件数、findings 数、severity 分布、测试结果
- Severity 筛选器：All / Critical / Warning / Style
- Finding 卡片列表：
  - Critical 默认展开，其余收起
  - 展开后显示：evidence chain（步骤编号 + 文件链接 + 代码片段 + 观察）、test verification、suggestion
  - Accept / Dismiss 操作按钮

### UI 设计规范（V2 Teal 方案）

| 元素 | 值 |
|------|------|
| 背景色 | `#F5F3EF` 暖灰 |
| 卡片背景 | `#FFFFFF` |
| 主色 | `#2D7A6F` Teal（渐变 → `#4AA89C`） |
| 主色浅底 | `#EBF5F3` |
| 文字色 | `#1A1A1A` |
| 次要文字 | `#9A9590` |
| 边框色 | `#E4E0DA` |
| Critical | `#D1453B`（底色 `#FDECEB`） |
| Warning | `#C68B00`（底色 `#FFF5DC`） |
| Style | `#7A7570`（底色 `#F0EEEB`） |
| 字体 | DM Sans |
| 圆角 | 卡片 10px，页面容器 14px，badge 6px |

---

## 4. 部署

### Docker Compose 架构

```yaml
services:
  db:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      - POSTGRES_USER=codeguard
      - POSTGRES_PASSWORD=codeguard
      - POSTGRES_DB=codeguard
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U codeguard"]
      interval: 5s
      retries: 5

  server:
    build: ./server
    ports: ["9527:9527"]
    depends_on:
      db:
        condition: service_healthy
    environment:
      - STORAGE_BACKEND=postgres
      - DATABASE_URL=postgresql+asyncpg://codeguard:codeguard@db:5432/codeguard

  web:
    build: ./web
    ports: ["3014:80"]
    depends_on: [server]
    # nginx 反代 /api/* → server:9527

volumes:
  pgdata:
```

- **db 容器**：PostgreSQL 16 Alpine，带健康检查
- **server 容器**：FastAPI 应用，等待 db 健康后启动
- **web 容器**：Nginx serve React 静态文件 + 反代 `/api/*` 到 server
- 一键启动：`docker compose up -d`

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `STORAGE_BACKEND` | 存储后端 | `postgres` |
| `DATABASE_URL` | 数据库连接串 | `postgresql+asyncpg://codeguard:codeguard@db:5432/codeguard` |
| `CODEGUARD_API_KEY` | 项目 API Key（Plugin 上传用） | 无 |

切换 SQLite（轻量开发）：
```
STORAGE_BACKEND=sqlite
DATABASE_URL=sqlite+aiosqlite:///data/codeguard.db
```

---

## 5. MVP 范围

### 包含

- Plugin：ReviewAgent、3 个内置 skills、Hook 自动触发、slash command 手动触发、上传脚本
- Server：REST API、PostgreSQL 存储（默认）+ SQLite 可选、API Key 认证、Alembic 迁移
- Web：项目列表、Review 列表、Review 详情（evidence chain + test verification + accept/dismiss）
- Docker Compose 一键部署

### 不包含（后续迭代）

- SQLite 存储实现（接口已预留，轻量开发场景）
- VCS 集成（GitLab/GitHub/Bitbucket，接口已预留）
- Team Dashboard（趋势看板）
- Report 过期清理
- 自定义 review skills 的热加载

---

## 6. 验证方式

1. **Plugin**：在 Claude Code 中安装插件，执行一次编码任务，验证 ReviewAgent 自动触发并产出 JSON
2. **手动触发**：执行 `/codeguard:review`，验证对当前 git diff 的审查
3. **Server**：`curl POST /api/v1/projects/{id}/reviews` 上传 mock JSON，验证存储和查询
4. **Web**：浏览器访问 `http://localhost:3014/projects`，验证三个页面渲染和交互
5. **端到端**：Plugin 完成审查 → 自动上传 → Web 查看完整 report
6. **Docker**：`docker compose up -d` 一键启动，验证两个容器正常运行
