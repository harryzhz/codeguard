# Review Loop 闭环实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打通 CodeGuard "审查→修复"完整闭环，包含 TUI 和 Web UI 两条路径。

**Architecture:** 四个独立模块：(1) 自动触发 review-agent，(2) TUI 报告美化 + 交互式修复选择，(3) Web UI 语法高亮代码视图，(4) Web UI 批量 Accept + 复制修复清单。每个模块可独立工作。

**Tech Stack:** Claude Code Plugin（hooks/commands/agents）、Shiki（语法高亮）、React

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `codeguard-plugin/hooks/hooks.json` | Stop hook 改为自动触发 review |
| 修改 | `codeguard-plugin/commands/review.md` | 增加 review 后交互式选择 + 修复流程 |
| 修改 | `codeguard-plugin/agents/review-agent.md` | 美化 TUI 输出格式 |
| 新建 | `web/src/components/CodeBlock.tsx` | Shiki 语法高亮代码块组件 |
| 修改 | `web/src/components/EvidenceChain.tsx` | 用 CodeBlock 替换 `<pre>` |
| 新建 | `web/src/components/FixActionBar.tsx` | 浮动操作栏组件 |
| 新建 | `web/src/utils/fixPrompt.ts` | 将 findings 转为结构化修复 Prompt |
| 修改 | `web/src/pages/ReviewDetail.tsx` | 集成 FixActionBar |
| 修改 | `web/package.json` | 添加 shiki 依赖 |

---

### Task 1: 自动触发 review-agent

**Files:**
- Modify: `codeguard-plugin/hooks/hooks.json`

- [ ] **Step 1: 修改 Stop hook 为自动启动 review**

将 Stop hook 从打印提示消息改为自动启动 review 流程。由于 Claude Code hooks 的 Stop 事件可以触发 sub-agent，修改 hook 配置：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '[CodeGuard] 任务完成，正在启动代码审查...'"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "review-agent",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/upload-result.sh"
          }
        ]
      }
    ]
  }
}
```

> **注意**: 需要确认 Claude Code plugin hooks 系统是否支持在 Stop 事件中直接启动 sub-agent（`type: "agent"`）。如果支持，改为：
> ```json
> {
>   "type": "agent",
>   "agent": "review-agent",
>   "env": { "CODEGUARD_REVIEW_SCOPE": "task" }
> }
> ```
> 如果不支持，需要通过 shell 调用 `claude` CLI 来启动，或在 Stop hook 中 echo 一个提示让主 agent 继续执行 `/codeguard:review`。先部署后测试确定可行路径。

- [ ] **Step 2: 手动测试自动触发**

1. 在项目中做一个小改动
2. 让 Claude Code 完成一个任务
3. 观察 Stop hook 是否成功启动 review-agent
4. 如果失败，根据错误调整 hook 配置

- [ ] **Step 3: Commit**

```bash
git add codeguard-plugin/hooks/hooks.json
git commit -m "feat(plugin): auto-trigger review-agent on task completion"
```

---

### Task 2: 美化 review-agent TUI 输出

**Files:**
- Modify: `codeguard-plugin/agents/review-agent.md`

- [ ] **Step 1: 重写 review-agent.md 的输出格式指令**

替换 `review-agent.md` 中 Step 5 的输出格式指令（从第 55 行 `### Step 5: Produce Output and Save` 开始到第 109 行 `- Format it nicely with markdown tables or lists`），改为以下内容：

````markdown
### Step 5: Produce Output and Save

Build the review JSON object following this schema:

```json
{
  "project": "<project name from git remote or directory basename>",
  "timestamp": "<ISO 8601 UTC>",
  "summary": {
    "files_reviewed": 0,
    "total_findings": 0,
    "critical": 0,
    "warning": 0,
    "style": 0,
    "tests_run": false,
    "tests_passed": 0,
    "tests_failed": 0
  },
  "files_changed": [],
  "findings": [
    {
      "severity": "critical | warning | style",
      "confidence": 0.0,
      "title": "One-line description",
      "description": "Detailed explanation",
      "category": "logic | security | performance | style",
      "evidence_chain": [
        {
          "step": 1,
          "file": "path/to/file.py",
          "line": 42,
          "snippet": "relevant code",
          "observation": "what was observed"
        }
      ],
      "test_verification": {
        "status": "passed | failed | no_coverage",
        "test_name": "",
        "output": ""
      },
      "suggestion": "How to fix"
    }
  ]
}
```

**CRITICAL: You MUST save the JSON to a file using Bash.** This is required for the upload hook to work.

Run this command (replacing the JSON content):
```bash
mkdir -p .codeguard && cat > .codeguard/last-review.json << 'CODEGUARD_EOF'
<your complete JSON here>
CODEGUARD_EOF
```

### Step 6: Display Formatted Report

After saving the JSON, display a formatted TUI report. Follow this exact format:

```
───────────────────────────────────────────
  [CodeGuard] 审查报告

  ┌──────────┬──────┐
  │ 严重程度 │ 数量 │
  ├──────────┼──────┤
  │ Critical │ N    │
  │ Warning  │ N    │
  │ Style    │ N    │
  │ 合计     │ N    │
  └──────────┴──────┘

  测试结果：N passed / N failed
───────────────────────────────────────────
```

Then for each severity group, display findings:

**Critical findings** — show full detail (each finding on multiple lines):
```
  Critical 问题

  1. <title>
     <file>:<line>
     <description>
     建议: <suggestion>
```

**Warning findings** — compact single line each:
```
  Warning 问题

  N. <title> — <file>:<line>
```

**Style findings** — compact single line each:
```
  Style 建议

  N. <title> — <file>:<line>
```

**Important formatting rules:**
- File paths MUST be on their own line for Critical findings (enables VSCode terminal click-to-jump)
- Use sequential numbering across all findings (1, 2, 3... not restarting per severity)
- End with: `完整报告已保存至 .codeguard/last-review.json`
````

注意：同时删除 JSON schema 中的 `"version": "1.0"` 和 `"review_id": "uuid"` 字段（服务器自动生成这些）。

- [ ] **Step 2: Commit**

```bash
git add codeguard-plugin/agents/review-agent.md
git commit -m "feat(plugin): beautify review-agent TUI output format"
```

---

### Task 3: TUI 交互式 Accept + 修复

**Files:**
- Modify: `codeguard-plugin/commands/review.md`

- [ ] **Step 1: 重写 review.md 命令，增加 review 后交互流程**

将 `commands/review.md` 完整替换为以下内容：

````markdown
---
allowed-tools: Agent, Bash, Read, Grep, Glob, Write, Edit
description: Run CodeGuard code review and optionally fix accepted findings
---

Run a CodeGuard code review on the current uncommitted changes, then let the user choose which findings to fix.

## Steps

### Phase 1: Run Review

1. Run `git diff --name-only` and `git diff --staged --name-only` to find changed files.
2. If no changes found, tell the user "[CodeGuard] No uncommitted changes to review." and stop.
3. If changes exist, print "[CodeGuard] Reviewing N changed file(s)..." and list them.
4. Launch the `review-agent` sub-agent to review the changed files. Pass environment variable `CODEGUARD_REVIEW_SCOPE=diff`.

### Phase 2: Interactive Fix Selection

After the review agent completes:

1. Read `.codeguard/last-review.json` to get the review results.
2. If there are 0 findings, print "[CodeGuard] No issues found. Great job!" and stop.
3. Present an interactive selection to the user. Ask which findings to fix using a multi-select question. The options should be:
   - Each finding as a selectable option: `#N [severity] title — file:line`
   - A "Fix all" option
   - A "Skip for now" option
4. If the user selects "Skip for now", print "[CodeGuard] Review complete. Findings saved to .codeguard/last-review.json" and stop.

### Phase 3: Fix Selected Findings

For each selected finding:

1. Read the finding's file, evidence chain, and suggestion from the JSON.
2. Apply the fix described in the suggestion. Use your judgment — the suggestion is guidance, not a literal patch.
3. After fixing, print: `[CodeGuard] Fixed #N: <title>`

After all fixes are applied:

1. Print a summary: `[CodeGuard] Fixed N finding(s). Run tests to verify.`
2. If the project has a test suite, ask the user if they want to run tests now.
````

- [ ] **Step 2: Commit**

```bash
git add codeguard-plugin/commands/review.md
git commit -m "feat(plugin): add interactive fix selection after review"
```

---

### Task 4: Web UI — Shiki 语法高亮代码块

**Files:**
- Modify: `web/package.json`
- Create: `web/src/components/CodeBlock.tsx`
- Modify: `web/src/components/EvidenceChain.tsx`

- [ ] **Step 1: 安装 shiki 依赖**

```bash
cd web && npm install shiki
```

- [ ] **Step 2: 创建 CodeBlock 组件**

Create `web/src/components/CodeBlock.tsx`:

```tsx
import { useEffect, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";

interface CodeBlockProps {
  code: string;
  file?: string;
  line?: number;
  observation?: string;
}

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light"],
      langs: ["python", "typescript", "javascript", "json", "bash", "html", "css", "sql", "yaml", "go", "rust"],
    });
  }
  return highlighterPromise;
}

function detectLang(file?: string): string {
  if (!file) return "text";
  const ext = file.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    py: "python", ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    json: "json", sh: "bash", bash: "bash", html: "html", css: "css",
    sql: "sql", yml: "yaml", yaml: "yaml", go: "go", rs: "rust",
  };
  return map[ext ?? ""] ?? "text";
}

export function CodeBlock({ code, file, line, observation }: CodeBlockProps) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    const lang = detectLang(file);
    if (lang === "text") {
      setHtml("");
      return;
    }
    let cancelled = false;
    getHighlighter().then((h) => {
      if (cancelled) return;
      setHtml(h.codeToHtml(code, { lang, theme: "github-light" }));
    });
    return () => { cancelled = true; };
  }, [code, file]);

  return (
    <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #E5E1DB", marginTop: "6px" }}>
      {file && (
        <div style={{
          backgroundColor: "#1E1E2E",
          color: "#CDD6F4",
          padding: "6px 12px",
          fontSize: "12px",
          fontFamily: "monospace",
        }}>
          {file}{line != null && `:${line}`}
        </div>
      )}
      <div style={{ position: "relative" }}>
        {html ? (
          <div
            data-testid="highlighted-code"
            dangerouslySetInnerHTML={{ __html: html }}
            style={{ fontSize: "12px", overflow: "auto" }}
          />
        ) : (
          <pre
            data-testid="code-block"
            style={{
              backgroundColor: "#FAFAF8",
              padding: "8px 12px",
              fontFamily: "monospace",
              fontSize: "12px",
              margin: 0,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {code}
          </pre>
        )}
        {line != null && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "100%",
            pointerEvents: "none",
            background: "rgba(209,69,59,0.06)",
            borderLeft: "3px solid #D1453B",
          }} />
        )}
      </div>
      {observation && (
        <div style={{
          backgroundColor: "#FEF9E7",
          borderTop: "1px solid #F0E6B8",
          padding: "8px 12px",
          fontSize: "12px",
          color: "#5D4E0B",
        }}>
          💬 {observation}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 修改 EvidenceChain 使用 CodeBlock**

替换 `web/src/components/EvidenceChain.tsx` 中的 `<pre>` 代码块（第 50-65 行）为 `CodeBlock`：

将整个 snippet 渲染部分：
```tsx
{step.snippet && (
  <pre
    data-testid="code-block"
    style={{
      backgroundColor: "#F5F3EF",
      padding: "8px 12px",
      borderRadius: "6px",
      fontFamily: "monospace",
      fontSize: "12px",
      marginTop: "6px",
      overflowX: "auto",
      whiteSpace: "pre-wrap",
    }}
  >
    {step.snippet}
  </pre>
)}
```

替换为：

```tsx
{step.snippet && (
  <CodeBlock
    code={step.snippet}
    file={step.file}
    line={step.line}
  />
)}
```

并在文件顶部添加 import：
```tsx
import { CodeBlock } from "./CodeBlock";
```

- [ ] **Step 4: 验证构建通过**

```bash
cd web && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add web/package.json web/package-lock.json web/src/components/CodeBlock.tsx web/src/components/EvidenceChain.tsx
git commit -m "feat(web): add Shiki syntax highlighting for code blocks"
```

---

### Task 5: Web UI — 批量 Accept + 复制修复清单

**Files:**
- Create: `web/src/utils/fixPrompt.ts`
- Create: `web/src/components/FixActionBar.tsx`
- Modify: `web/src/pages/ReviewDetail.tsx`

- [ ] **Step 1: 创建 fixPrompt 工具函数**

Create `web/src/utils/fixPrompt.ts`:

```typescript
import type { Finding } from "../api/client";

export function generateFixPrompt(findings: Finding[]): string {
  const lines = ["Please fix the following code review findings:", ""];

  findings.forEach((f, i) => {
    const fileRef = f.evidence_chain.length > 0
      ? `${f.evidence_chain[0].file ?? "unknown"}${f.evidence_chain[0].line != null ? `:${f.evidence_chain[0].line}` : ""}`
      : "unknown location";

    lines.push(`## Finding ${i + 1} [${f.severity}] - ${f.title}`);
    lines.push(`- File: ${fileRef}`);
    lines.push(`- Issue: ${f.description}`);
    lines.push(`- Fix: ${f.suggestion}`);
    lines.push("");
  });

  return lines.join("\n");
}
```

- [ ] **Step 2: 创建 FixActionBar 组件**

Create `web/src/components/FixActionBar.tsx`:

```tsx
import { useState } from "react";
import type { Finding } from "../api/client";
import { generateFixPrompt } from "../utils/fixPrompt";

interface FixActionBarProps {
  findings: Finding[];
}

export function FixActionBar({ findings }: FixActionBarProps) {
  const [copied, setCopied] = useState(false);
  const accepted = findings.filter((f) => f.status === "accepted");

  if (accepted.length === 0) return null;

  const handleCopy = async () => {
    const prompt = generateFixPrompt(accepted);
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-testid="fix-action-bar"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        borderTop: "1px solid #E5E1DB",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        zIndex: 100,
        boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <span style={{ fontSize: "14px", color: "#1A1A1A" }}>
        {accepted.length} finding(s) accepted
      </span>
      <button
        data-testid="copy-fix-prompt"
        onClick={handleCopy}
        style={{
          padding: "8px 20px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: copied ? "#4AA89C" : "#2D7A6F",
          color: "#FFFFFF",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "background-color 0.2s",
        }}
      >
        {copied ? "Copied!" : "Copy Fix Prompt"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 集成 FixActionBar 到 ReviewDetail**

修改 `web/src/pages/ReviewDetail.tsx`：

在文件顶部添加 import：
```tsx
import { FixActionBar } from "../components/FixActionBar";
```

在 `ReviewDetail` 组件的 return 中，在最外层 `<div>` 的闭合标签前、`</div>` 之前添加：

```tsx
{review && <FixActionBar findings={review.findings} />}
```

同时给 findings 列表区域添加 bottom padding，避免被浮动栏遮挡：

将 `<div style={{ padding: "24px", maxWidth: "960px", margin: "0 auto" }}>` 改为：
```tsx
<div style={{ padding: "24px", maxWidth: "960px", margin: "0 auto", paddingBottom: "80px" }}>
```

- [ ] **Step 4: 验证构建通过**

```bash
cd web && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add web/src/utils/fixPrompt.ts web/src/components/FixActionBar.tsx web/src/pages/ReviewDetail.tsx
git commit -m "feat(web): add fix action bar with copy-to-clipboard prompt"
```

---

## 验证

### 端到端测试

1. **TUI 路径**：
   - 执行 `/codeguard:review`
   - 检查输出是否使用美化格式（表格、文件路径可点击）
   - 检查是否出现 multi-select 选择界面
   - 选择修复一个 finding，观察是否自动修复

2. **Web UI — 代码高亮**：
   - 打开 review 详情页
   - 展开一个 finding 的 evidence chain
   - 确认代码片段有语法高亮、文件名标题栏、问题行标注

3. **Web UI — 修复清单**：
   - Accept 2-3 个 findings
   - 确认底部出现浮动操作栏
   - 点击 "Copy Fix Prompt"，粘贴到文本编辑器确认格式正确
   - 粘贴到 Claude Code 终端，确认 Claude 能理解并执行修复
