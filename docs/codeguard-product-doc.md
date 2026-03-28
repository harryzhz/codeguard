# CodeGuard

> Give your Claude Code a second pair of eyes.

---

## What is CodeGuard

CodeGuard is a Claude Code plugin that automatically reviews your code the moment Claude Code finishes a task.

Instead of pushing code and waiting for a human reviewer or a CI-based review bot, CodeGuard runs a dedicated ReviewAgent right inside your Claude Code session. This ReviewAgent reads your entire project — not just the diff — traces cross-file dependencies, runs your existing tests, and produces a visual review report you can browse in your browser.

The result is not "AI opinions." It's evidence-backed findings with traced reasoning, test verification, and clear confidence levels.

---

## The problem

### AI writes code faster than humans can review it

41% of commits on GitHub now contain AI-generated code. Tools like Cursor, Claude Code, and Copilot let developers produce code at unprecedented speed. But review capacity hasn't scaled with it. The bottleneck has shifted from writing to reviewing.

In practice, this means:
- AI-generated code enters the codebase with superficial or no review
- Reviewers rubber-stamp PRs because the volume is too high
- Bugs that a careful reviewer would catch slip into production
- Teams lose confidence in their codebase over time

### Existing AI review tools don't solve this

Tools like CodeRabbit and Sourcery receive a diff, send it to an LLM, and return comments. This approach has fundamental limitations:

**They only see the diff.** A change to a utility function might break 12 callers across 8 files. Diff-based tools can't see those callers. They review each file in isolation.

**They can't verify their claims.** When the tool says "this might cause a race condition," there's no way to know if it's a real issue or a false alarm. Reviewers learn to ignore these comments.

**They add another tool to maintain.** Separate SaaS, separate billing, separate configuration, separate context from where you actually write code.

---

## How CodeGuard works

### The flow

You use Claude Code normally. You ask it to add a feature, fix a bug, refactor a module. Claude Code does the work.

When Claude Code completes the task, CodeGuard automatically kicks in. A dedicated ReviewAgent — running as a Sub Agent inside your same Claude Code session — reviews everything that just changed.

The ReviewAgent doesn't just look at the diff. It inherits the main agent's full project context. It follows imports, traces function calls across files, checks if existing tests cover the new code, and actually runs those tests. It builds an evidence chain for every finding.

When the review is done, you see a one-line summary in your terminal:

```
[CodeGuard] Review complete. 2 critical, 1 warning → http://localhost:3014/review/a1b2c3
```

Click the link. Your browser opens a clean visual report where you can browse findings, trace evidence chains, see test results, and accept or dismiss each item.

If the project is connected to GitLab, CodeGuard also posts a summary to the MR as a comment with a link to the full report.

### What makes it different

**Full project context.** The ReviewAgent runs as a Sub Agent inside your Claude Code session. It inherits everything the main agent already knows — file structure, module relationships, recent changes. No re-indexing, no cold start. This means it catches issues that diff-based tools structurally cannot.

**Verifiable findings.** Every finding comes with an evidence chain — a step-by-step trace showing how the ReviewAgent reached its conclusion. You can follow the chain yourself and verify the reasoning in seconds. No more guessing whether the AI is right.

**Test verification.** The ReviewAgent runs your project's existing tests and links the results to its findings. If it says "this change breaks concurrent payment handling" and the concurrency test actually fails, the finding is marked as confirmed. If there's no test coverage for the concern, it tells you that too.

**Confidence levels.** Each finding is tagged with a severity and confidence score:
- **Critical** (red) — confirmed by test failure or definitive code analysis
- **Warning** (yellow) — high-confidence concern, needs human judgment
- **Style** (gray) — suggestion, safe to ignore

You can filter the report to show only critical findings. A busy day? Just check the red ones. Five minutes.

**Zero context switch.** You don't leave your development environment. Claude Code finishes, review happens automatically, you see the result. If something needs fixing, you tell Claude Code "fix the race condition that CodeGuard found" — it already has the context.

---

## The plugin

### What is a Claude Code plugin

A Claude Code plugin is a shareable package that bundles custom functionality into Claude Code. It's essentially your `.claude/` directory configuration — skills, agents, hooks, scripts — packaged into a standardized format that can be installed with a single command and shared across projects and teams.

Plugins were introduced in Claude Code v1.0.33 (October 2025) and are now in public beta. They are the standard way to distribute Claude Code customizations.

A plugin can contain any combination of:
- **Skills** — knowledge and guidelines that Claude Code applies during tasks
- **Agents** — specialized Sub Agents for specific jobs
- **Hooks** — event handlers that fire on Claude Code lifecycle events
- **MCP Servers** — connections to external tools and data sources
- **Commands** — custom slash commands

All components are namespaced to prevent conflicts. If the plugin is named `codeguard`, its skills appear as `/codeguard:review`, its agents are prefixed with `codeguard:`, and so on. Two different plugins can both define a `review` skill without clashing.

### How to install CodeGuard

There are two ways to install:

**From a marketplace (recommended for teams):**

Open Claude Code and run:

```
/plugin install codeguard@claude-plugins-official
```

Claude Code downloads the plugin into `~/.claude/plugins/cache/` and makes it available immediately. Skills, agents, and hooks all activate automatically.

**For team-wide deployment:**

Add CodeGuard to your project's `.claude/settings.json` so every team member gets it automatically:

```json
{
  "extraKnownMarketplaces": ["your-org/claude-plugins"]
}
```

When a developer opens the project, Claude Code prompts them to install the marketplace and its plugins. Everyone gets the same review configuration.

### What happens when you install it

Installing CodeGuard adds the following to your Claude Code environment:

**A ReviewAgent** (Sub Agent) that specializes in code review. It has its own system prompt optimized for finding bugs, security issues, and code quality problems. It uses Claude Code's native tools — read files, search code, run bash commands — so it has the same capabilities as the main agent, but focused specifically on review.

**Review skills** that guide what the ReviewAgent checks for. These are markdown files containing structured review guidelines (general quality, security, performance). Claude Code loads them automatically when the ReviewAgent runs. Skills only enter the context window when relevant, so they don't slow down your normal work.

**Hooks** that trigger the review flow at the right moment. A `Stop` hook fires when the main agent completes its task, launching the ReviewAgent. A `SubagentStop` hook fires when the ReviewAgent finishes, uploading the results to the CodeGuard server.

**A slash command** `/codeguard:review` for manual review triggers. If you want to review changes before the task is formally "done," you can run this anytime.

### What it does NOT do

**It does not change how Claude Code normally behaves.** The main agent works exactly as before. The ReviewAgent only activates after a task completes (or when you manually trigger it). Your normal coding workflow is untouched.

**It does not send your code to a third-party LLM.** All analysis happens inside your Claude Code session, using your existing Claude subscription. The only data sent externally is the structured review result (findings, evidence chains, test results) — uploaded to the CodeGuard server for visual display.

**It does not require any additional API keys for AI.** The ReviewAgent uses the same Claude API credentials that power your Claude Code session. The only additional credential is a CodeGuard server API key for uploading results.

**It does not add meaningful latency to normal operations.** Hooks only fire on specific lifecycle events (task completion), not on every tool use. Skills load lazily — they enter the context only when the ReviewAgent runs. During normal coding, CodeGuard is invisible.

### Plugin structure

```
codeguard/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (metadata)
│
├── agents/
│   └── review-agent.md          # ReviewAgent Sub Agent definition
│
├── skills/
│   ├── general-review/
│   │   └── SKILL.md             # General code quality review
│   ├── security-review/
│   │   └── SKILL.md             # Security-focused checks
│   ├── performance-review/
│   │   └── SKILL.md             # Performance review
│   └── output-format/
│       └── SKILL.md             # Structured JSON output format
│
├── hooks/
│   ├── hooks.json               # Hook event configuration
│   └── scripts/
│       └── upload-result.sh     # Upload review JSON to server
│
└── settings.json                # Default settings (activates ReviewAgent)
```

**Important:** All component directories (agents, skills, hooks) live at the plugin root level. Only `plugin.json` goes inside `.claude-plugin/`. This is a Claude Code convention — putting components inside `.claude-plugin/` causes them to not load.

---

## Use cases

### 1. Solo developer reviewing AI-generated code

**Situation:** You're building a side project with Claude Code. You're moving fast, shipping features in hours. But you have a nagging feeling — is the AI cutting corners? Are there edge cases it missed?

**Without CodeGuard:** You either spend time manually reviewing every change (defeating the speed advantage) or you ship without review and hope for the best.

**With CodeGuard:** Every time Claude Code completes a task, you get an instant review. You glance at the terminal — "0 critical, 1 warning." You open the report, see it's a minor input validation suggestion, accept it, move on. Total time: 30 seconds. Peace of mind: priceless.

### 2. Team with mixed skill levels

**Situation:** Your team has 2 senior engineers and 5 juniors. The juniors use Claude Code heavily. The seniors are drowning in review requests. Half the PRs get "LGTM" without real review because the seniors don't have bandwidth.

**Without CodeGuard:** Code quality gradually degrades. The seniors burn out. Bugs increase. Nobody notices until a production incident.

**With CodeGuard:** Every developer gets an automated first-pass review before code even reaches the PR. The review includes evidence chains — the senior doesn't need to trace through the code themselves to understand the issue. They focus on the critical findings and architecture decisions. Review time drops from 45 minutes to 10 minutes per PR.

### 3. Security-sensitive projects

**Situation:** You're building a fintech product. Every code change that touches payments, authentication, or user data needs careful security review. Your team doesn't have a dedicated security engineer.

**Without CodeGuard:** Security review is ad-hoc. Sometimes someone remembers to check for SQL injection. Sometimes they don't.

**With CodeGuard:** The security review skill is loaded. Every change that touches a database query, user input, or auth flow gets automatically checked. The ReviewAgent traces data flow from input source to database sink. When it finds an unparameterized query, it shows you exactly how user input reaches that query — file by file, function by function.

### 4. Onboarding new team members

**Situation:** A new developer joins the team. They don't know the codebase conventions — where to put error handling, which ORM patterns to use, how the team structures API endpoints.

**Without CodeGuard:** The new developer writes code that works but doesn't follow team conventions. The reviewer has to point out the same style issues repeatedly. The new developer feels micromanaged.

**With CodeGuard:** You create a team-rules skill that encodes your conventions. The new developer gets consistent, non-judgmental feedback on every change. They learn the team's patterns naturally, without the reviewer spending time on style comments. The reviewer can focus on logic and architecture.

### 5. Open source maintainer

**Situation:** You maintain a popular open source project. Contributors submit PRs with varying quality. You need to review each one, but you only have evenings and weekends.

**Without CodeGuard:** PRs pile up. Contributors get frustrated waiting. You rush through reviews and miss issues. Or you just stop reviewing and the project stagnates.

**With CodeGuard:** Every PR gets an automated review with evidence chains. You open the CodeGuard report, see the critical findings, and focus your limited time on the ones that matter. Contributors see the review feedback immediately and can fix issues before you even look at the PR.

---

## Review skills

Review skills are the guidelines that tell the ReviewAgent what to focus on and how to check it. They're markdown files inside the plugin's `skills/` directory, each in its own subdirectory with a `SKILL.md` file.

Claude Code loads skills lazily — they only enter the context window when the ReviewAgent runs. During normal coding, they're invisible and consume zero tokens.

### Built-in skills

**General quality** — Logic errors, edge cases, error handling, resource cleanup, naming clarity. The default review that runs on every change.

**Security** — SQL injection, auth bypass, secret exposure, input sanitization, SSRF. Traces data flow from user input to dangerous operations.

**Performance** — N+1 queries, unbounded loops, missing pagination, large memory allocations, blocking I/O in async code.

### Custom skills

You write your own skills as markdown files. A skill is just a description of what to check, written in natural language. The ReviewAgent reads it and follows the instructions.

Example: your team has a rule that all API endpoints must return errors in a specific format. You write a skill that says "check all new API endpoints for compliance with our ErrorResponse schema." The ReviewAgent will do exactly that — read the new endpoint, find the ErrorResponse schema in the codebase, and verify compliance.

To add a custom skill, create a directory under `skills/` in the plugin:

```
skills/
└── team-rules/
    └── SKILL.md
```

Skills are version-controlled with your plugin. When the team's standards evolve, the skills evolve with them.

### Sharing skills

Skills are portable. A security skill written for one FastAPI project works for another FastAPI project. Teams can share skills by distributing them as part of the plugin or through a marketplace.

Future: a skill marketplace where teams publish and discover review skills for specific frameworks, languages, and compliance requirements.

---

## The review report

When you open a CodeGuard review report in the Web UI, you see:

### Summary bar

A quick overview: how many files were reviewed, how many findings at each severity level, whether tests were run and what the results were. This tells you in 2 seconds whether you need to pay attention.

### Findings list

Each finding is a card with:

**Severity badge** — red (critical), yellow (warning), or gray (style). Filter by severity to focus on what matters.

**One-line summary** — What the issue is, in plain language. "Race condition: balance check and deduction are not atomic."

**Evidence chain** — The traced reasoning path. Each step shows a file, a line, a code snippet, and what the ReviewAgent observed at that step. You can follow the chain to verify the reasoning yourself. This is the key differentiator — you're not trusting a black box, you're seeing the work.

**Test verification** — If the ReviewAgent ran tests related to this finding, you see the result. "Test `test_concurrent_deduction` FAILED: both concurrent payments succeeded, balance went negative." This turns an AI opinion into empirical evidence.

**Actions** — Accept (you agree, will fix), Dismiss (false alarm or intentional). Your response is tracked, so over time the team can see the review adoption rate.

### Code browser

Click on any file name in a finding to see the full file with review comments highlighted inline — similar to how you'd see comments on a GitLab MR, but with the evidence chain attached to each comment.

---

## Workflow integration

### Daily development

The primary workflow is fully automatic. You use Claude Code → CodeGuard reviews → you check the report. No commands to run, no buttons to click, no CI to configure.

If you want to run a review manually at any point, use the slash command:

```
/codeguard:review
```

This triggers the ReviewAgent immediately on the current state of your working directory.

### GitLab integration

If you connect a GitLab project, CodeGuard posts a review summary as a MR comment when you push. The comment includes the severity breakdown, top critical findings, and a link to the full visual report. Your team's existing MR review workflow stays the same — CodeGuard just adds an automated first pass.

### Team dashboard

For team leads and engineering managers: a dashboard showing review trends across the team. How many findings per week, what severity distribution, which types of issues come up most often, what's the adoption rate (accepted vs dismissed). This data helps you understand where the team needs training or where the codebase has systemic issues.

---

## What CodeGuard is not

**Not a replacement for human review.** CodeGuard is a first pass. It catches the things that are tedious to check manually — cross-file consistency, test coverage gaps, security patterns. The human reviewer still makes the final call on architecture, business logic, and design decisions.

**Not another LLM API wrapper.** CodeGuard doesn't call any LLM directly. All analysis happens inside Claude Code via the ReviewAgent Sub Agent. The server only stores and displays results.

**Not a linter or SAST tool.** Linters check syntax. SAST tools check known vulnerability patterns. CodeGuard does contextual review — understanding what the code is trying to do and whether it does it correctly.

---

## Getting started

### 1. Install the plugin

In Claude Code, run:

```
/plugin install codeguard@codeguard-marketplace
```

Or for local testing during development:

```bash
claude --plugin-dir ./codeguard-plugin
```

The plugin activates immediately. You'll see its skills and agents listed in the session init message.

### 2. Start the server

```bash
git clone https://github.com/codeguard/codeguard-server.git
cd codeguard-server
docker compose up -d
```

Set the environment variables that the plugin's upload hook needs:

```bash
export CODEGUARD_SERVER="http://localhost:9527"
export CODEGUARD_API_KEY="your-project-api-key"
```

### 3. Use Claude Code normally

That's it. Next time Claude Code completes a task, the ReviewAgent runs automatically, and you'll see the review summary in your terminal with a link to the full visual report.

### For teams

Add the CodeGuard marketplace to your project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": ["codeguard/marketplace"]
}
```

When team members open the project, Claude Code prompts them to install the plugin. Everyone gets the same review skills and configuration automatically.

---

## Open source

CodeGuard is fully open source under the MIT license. Plugin, server, and Web UI — everything is free to use, modify, and distribute.

**Self-host the server** with Docker Compose. Your review data stays on your own infrastructure. No usage limits, no feature gates, no "upgrade to unlock."

**Contribute review skills.** The built-in skills (general, security, performance) are a starting point. If your team writes a great review skill for a specific framework or compliance requirement, contribute it back. The best review guidelines should be a public good, not locked behind a paywall.

**Why open source?** AI-assisted code review shouldn't be a luxury. Every developer using Claude Code should be able to verify what the AI wrote. The more teams adopt evidence-based review, the higher the overall quality bar for AI-generated code.

CodeGuard does not consume LLM tokens on its own. The ReviewAgent runs inside your Claude Code session using your existing Claude subscription. The server is a lightweight data store and UI — it can run on a $5/month VPS.
