# CodeGuard Review Loop 闭环设计

## 概述

当前 CodeGuard 存在四个核心痛点，本设计旨在逐一解决，打通"审查→修复"完整闭环。

| # | 痛点 | 解决方案 |
|---|------|----------|
| 1 | Stop Hook 没有自动启动 review-agent | 修改 hooks.json，Stop 事件直接启动 review-agent |
| 2 | TUI 输出不够完整，无法直接操作 | 美化 review-agent 输出 + multi-select 交互式 Accept |
| 3 | Web UI Accept 按钮没有后续动作 | 浮动操作栏 + 一键复制结构化修复 Prompt |
| 4 | 代码片段展示不够友好 | Shiki 语法高亮 + 行号 + 问题行标注 |

---

## 1. 自动触发 Review-Agent

### 现状

```json
// hooks.json - Stop hook
{
  "type": "command",
  "command": "echo '[CodeGuard] Task complete. Run /codeguard:review to trigger a code review.'"
}
```

Stop hook 仅打印提示消息，需用户手动执行 `/codeguard:review`。

### 方案

修改 `hooks.json`，将 Stop hook 改为启动 review-agent sub-agent：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '[CodeGuard] 正在启动代码审查...'"
          }
        ]
      }
    ]
  }
}
```

同时修改 `/codeguard:review` 命令（`commands/review.md`），使其在 Stop 事件触发时也能被自动调用。具体机制：

- 方案 A：Stop hook 直接在 command 中调用 `claude` CLI 启动 review-agent
- 方案 B：在 review-agent.md 中配置为 Stop 事件的自动 sub-agent（如果 Claude Code 插件系统支持）

> **注意**：需确认 Claude Code hooks 系统是否支持 `type: "agent"` 来直接启动 sub-agent。如不支持，退而使用 shell 调用 `claude` CLI。

### 改动文件

- `codeguard-plugin/hooks/hooks.json`
- 可能需要修改 `codeguard-plugin/commands/review.md`

---

## 2. TUI 报告美化 + 交互式 Accept

### 现状

review-agent 完成后输出格式粗糙，用户无法在终端内直接操作 findings。

### 方案

分两步：美化输出 + 交互式选择。

#### 2a. 美化 TUI 输出格式

review-agent 完成审查后，输出格式化报告。利用 VSCode 终端的文件路径跳转能力（`file:line` 格式可直接点击跳转）：

```
───────────────────────────────────────────
  [CodeGuard] 审查报告摘要

  ┌──────────┬──────┐
  │ 严重程度 │ 数量 │
  ├──────────┼──────┤
  │ Critical │ 2    │
  │ Warning  │ 5    │
  │ Style    │ 2    │
  │ 合计     │ 9    │
  └──────────┴──────┘

  测试结果：41 passed / 0 failed
───────────────────────────────────────────

  Critical 问题

  1. CORS 通配符 + credentials 危险组合
     server/app/main.py:45
     allow_origins=["*"] 与 allow_credentials=True 同时设置，
     应将 origins 限定为具体前端域名。

  2. 版本号计算竞态条件
     server/app/storage/postgres.py:58
     SELECT MAX(version) + 1 非原子操作，应使用行锁或重试。

───────────────────────────────────────────

  Warning 问题

  3. 请求日志泄露业务数据 — server/app/middleware.py:23
  4. Settings 重复实例化 — server/app/api/deps.py:24
  5. Shell 脚本 .env 注入风险 — codeguard-plugin/hooks/scripts/upload-result.sh:25
  ...

───────────────────────────────────────────
```

关键点：
- 文件路径独占一行，确保 VSCode 终端可点击跳转
- Critical 问题展示完整描述 + 修复建议
- Warning/Style 用紧凑单行格式
- 表格用 box-drawing 字符绘制

#### 2b. 交互式 Accept（multi-select）

报告输出后，利用 Claude Code 的交互能力让用户选择要修复的 findings：

**流程：**

1. review-agent 输出报告并保存 `.codeguard/last-review.json`
2. review-agent 完成退出 → SubagentStop hook 上传结果到 Server
3. 调用者（`/codeguard:review` 命令或 Stop hook 后续流程）读取 JSON
4. 呈现 multi-select 选项（类似 plan 模式）：

```
请选择要修复的 findings（可多选）：

☐ #1 [critical] CORS 通配符 + credentials 危险组合 — server/app/main.py:45
☐ #2 [critical] 版本号计算竞态条件 — server/app/storage/postgres.py:58
☐ #3 [warning] 请求日志泄露业务数据 — server/app/middleware.py:23
☐ #4 [warning] Settings 重复实例化 — server/app/api/deps.py:24
☐ 全部修复
☐ 跳过，稍后处理
```

5. 用户选择后，主 agent 逐个修复选中的 findings
6. 每修复一个，同步更新 Server 上的 finding 状态为 `accepted`

**关键设计决策：**
- review-agent 是只读的（禁用 Write/Edit），不能修复代码
- 修复动作由**主 agent** 执行（它有完整的编辑权限）
- 所以交互式选择和修复逻辑放在 **`/codeguard:review` 命令** 中，review-agent 返回后继续执行

### 改动文件

- `codeguard-plugin/agents/review-agent.md` — 美化输出格式模板
- `codeguard-plugin/commands/review.md` — 增加 review-agent 返回后的交互式选择和修复流程
- `codeguard-plugin/hooks/scripts/upload-result.sh` — 确保上传后 JSON 文件保留（供后续读取）

---

## 3. Web UI：批量 Accept + 复制修复清单

### 现状

Accept/Dismiss 按钮只更新数据库状态，无后续动作。

### 方案

在 ReviewDetail 页面底部增加**浮动操作栏**：

```
┌─────────────────────────────────────────────────────────┐
│  ✓ 3 个 findings 已接受          [复制修复指令]  [清除选择]  │
└─────────────────────────────────────────────────────────┘
```

- 当 ≥1 个 finding 被 Accept 时出现
- **「复制修复指令」** 按钮：将所有 accepted findings 转为结构化 Prompt 并复制到剪贴板
- 复制成功后显示 toast 提示

#### 结构化 Prompt 格式

```markdown
Please fix the following code review findings:

## Finding 1 [critical] - CORS 通配符 + credentials 危险组合
- File: server/app/main.py:45
- Issue: allow_origins=["*"] 与 allow_credentials=True 同时设置，是 CSRF 攻击入口
- Fix: 将 origins 限定为具体前端域名

## Finding 2 [critical] - 版本号计算竞态条件
- File: server/app/storage/postgres.py:58
- Issue: SELECT MAX(version) + 1 非原子操作，并发下可能产生重复版本号
- Fix: 使用行锁、重试或数据库 SEQUENCE
```

### 改动文件

- `web/src/pages/ReviewDetail.tsx` — 增加浮动操作栏，追踪 accepted findings
- 新增 `web/src/utils/fixPrompt.ts` — 将 findings 数组转为结构化 Prompt 文本
- 新增 `web/src/components/FixActionBar.tsx` — 浮动操作栏组件

---

## 4. Web UI：类 GitHub Diff 代码视图

### 现状

EvidenceChain 中代码片段使用纯 `<pre>` 标签，无语法高亮、无行号。

### 方案

引入 **Shiki**（GitHub 同款语法高亮引擎），重写代码展示组件：

```
┌─ server/app/main.py ────────────────────────┐
│ 43 │     app.add_middleware(                 │
│ 44 │         CORSMiddleware,                 │
│ 45 │         allow_origins=["*"],        ← ← │ ← 问题行（浅红背景）
│ 46 │         allow_credentials=True,     ← ← │
│ 47 │         allow_methods=["*"],            │
│ 48 │     )                                   │
├──────────────────────────────────────────────┤
│ 💬 allow_origins=["*"] 与 allow_credentials  │
│    =True 同时设置，等同于允许任意来源携带凭据  │
└──────────────────────────────────────────────┘
```

设计要素：
- **文件名标题栏**：深色背景（#1E1E2E），白色文件路径
- **语法高亮**：Shiki + 自动语言检测（从文件扩展名推断）
- **行号**：左侧灰色行号列
- **问题行标注**：浅红色背景（`rgba(209,69,59,0.1)`），左边框红色
- **Observation 气泡**：问题行下方内联显示，浅黄色背景，类似 GitHub review comment

### 改动文件

- `web/package.json` — 添加 `shiki` 依赖
- 新增 `web/src/components/CodeBlock.tsx` — 封装 Shiki 高亮 + 行号 + 问题行标注
- 修改 `web/src/components/EvidenceChain.tsx` — 用 CodeBlock 替换 `<pre>`

---

## 实施优先级

| 优先级 | 模块 | 理由 |
|--------|------|------|
| P0 | 2a. TUI 输出美化 | 改动小，立即可见效果 |
| P0 | 2b. TUI 交互式 Accept | 打通核心闭环 |
| P1 | 1. 自动触发 | 依赖确认 hooks 机制 |
| P1 | 4. GitHub Diff 视图 | 显著提升 Web UI 体验 |
| P2 | 3. Web 浮动操作栏 | TUI 闭环打通后，Web 是补充路径 |
