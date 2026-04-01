---
allowed-tools: Agent, Bash, Read, Grep, Glob, Write, Edit, AskUserQuestion
description: Run CodeGuard code review on uncommitted changes, branch changes, commit range, or all files
---

Run a CodeGuard code review with flexible scope, then let the user choose which findings to fix.

## Supported Modes

| 用法 | 说明 |
|------|------|
| `/codeguard:review` | Review 未提交的变更（默认） |
| `/codeguard:review all` | Review 项目全量代码文件 |
| `/codeguard:review branch` | Review 当前分支相对主分支的所有变更 |
| `/codeguard:review branch <base>` | Review 当前分支相对指定基准分支的所有变更 |
| `/codeguard:review last` | Review 最近一次提交的变更 |
| `/codeguard:review <commit1>..<commit2>` | Review 指定 commit 范围的变更 |

## Steps

### Phase 1: Determine Scope and Collect Files

Parse the command arguments to determine review mode:

**Case 1: No arguments → `diff` mode**
1. Run `git diff --name-only` and `git diff --staged --name-only` to find changed files.
2. If no changes found, tell the user "[CodeGuard] No uncommitted changes to review." and stop.
3. Print "[CodeGuard] Reviewing N changed file(s) (uncommitted changes)..." and list them.

**Case 2: Argument is `all` → `all` mode**
1. Run `git ls-files` to get all tracked files.
2. Filter out binary file extensions: images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.ico`, `.svg`, `.webp`), fonts (`.woff`, `.woff2`, `.ttf`, `.eot`), archives (`.zip`, `.tar`, `.gz`), compiled (`.pyc`, `.o`, `.so`, `.dylib`), and other non-reviewable files (`.lock`, `.min.js`, `.min.css`).
3. If the file count exceeds the `max_files` setting (default 200), warn the user and ask for confirmation before proceeding.
4. Print "[CodeGuard] Reviewing N file(s) (all tracked files)..." and list them.

**Case 3: Argument is `branch` or `branch <base>` → `branch` mode**
1. Get the current branch name via `git rev-parse --abbrev-ref HEAD`.
2. Determine the base branch:
   - If a base branch name is provided after `branch`, use it.
   - Otherwise, auto-detect: check if `main` exists (`git rev-parse --verify main`), then `master`. Use the first one found.
3. If the current branch IS the base branch, tell the user "[CodeGuard] You are already on the base branch '<name>'. Switch to a feature branch first." and stop.
4. Find the merge base: `git merge-base <base-branch> HEAD`.
5. Get changed files: `git diff <merge-base>..HEAD --name-only`.
6. If no changes found, tell the user "[CodeGuard] No changes found between branch '<current>' and '<base>'." and stop.
7. Print "[CodeGuard] Reviewing N changed file(s) (branch '<current>' vs '<base>')..." and list them.

**Case 4: Argument is `last` → `commits` mode (last commit)**
1. Use `HEAD~1..HEAD` as the commit range.
2. Get changed files: `git diff HEAD~1..HEAD --name-only`.
3. If no changes found, tell the user "[CodeGuard] No changes found in the last commit." and stop.
4. Get the last commit message via `git log -1 --format=%s` and print "[CodeGuard] Reviewing N changed file(s) (last commit: '<message>')..." and list them.

**Case 5: Argument contains `..` → `commits` mode**
1. Use the argument as the commit range directly.
2. Get changed files: `git diff <range> --name-only`.
3. If the command fails (invalid commits), tell the user the error and stop.
4. If no changes found, tell the user "[CodeGuard] No changes found in range '<range>'." and stop.
5. Print "[CodeGuard] Reviewing N changed file(s) (commits <range>)..." and list them.

### Phase 2: Launch Review Agent

1. Determine the project name for the review output path:
   ```bash
   PROJECT_NAME=$(git remote get-url origin 2>/dev/null | sed 's/.*\///' | sed 's/\.git$//' || basename "$(pwd)")
   ```
   The review file will be saved at `~/.codeguard/${PROJECT_NAME}/last-review.json`.
2. Set environment variable `CODEGUARD_REVIEW_SCOPE` to the determined mode (`diff`, `all`, `branch`, or `commits`).
3. Set environment variable `CODEGUARD_REVIEW_FILES` to the newline-separated list of files collected in Phase 1.
4. Launch the `review-agent` sub-agent with these environment variables.

### Phase 2.5: Validate Review Output

After the review agent completes:

1. Run the validation script:
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/validate-review.py" ~/.codeguard/${PROJECT_NAME}/last-review.json
   ```
2. If validation passes (prints `OK`), proceed to Phase 3.
3. If validation fails, run the auto-fix script to repair the JSON in place:
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/fix-review.py" ~/.codeguard/${PROJECT_NAME}/last-review.json
   ```
   Then validate again. If it passes, proceed to Phase 3. If it still fails, print `[CodeGuard] Review output validation failed. Errors:` followed by the validation errors, then stop.

### Phase 3: Interactive Fix Selection

After the review agent completes:

1. Read `~/.codeguard/${PROJECT_NAME}/last-review.json` to get the review results.
2. If there are 0 findings, print "[CodeGuard] No issues found. Great job!" and stop.
3. Display finding details grouped by severity, using sequential numbering across all findings:

   **Critical findings** — full detail:
   ```
   Critical 问题

   1. <title>
      <file>:<line>
      <description>
      建议: <suggestion>
   ```

   **Warning findings** — show description:
   ```
   Warning 问题

   2. <title> — <file>:<line>
      <description>
   ```

   **Style findings** — compact:
   ```
   Style 建议

   3. <title> — <file>:<line>
   ```

4. Present an interactive selection to the user. Ask which findings to fix using a multi-select question. The options should be:
   - Each finding as a selectable option: `#N [severity] title — file:line`
   - A "Fix all" option
   - A "Skip for now" option
5. If the user selects "Skip for now", print "[CodeGuard] Review complete. Findings saved to ~/.codeguard/<project>/last-review.json"（使用实际项目名）and stop.

### Phase 4: Fix Selected Findings

For each selected finding:

1. Read the finding's file, evidence chain, and suggestion from the JSON.
2. Apply the fix described in the suggestion. Use your judgment — the suggestion is guidance, not a literal patch.
3. After fixing, print: `[CodeGuard] Fixed #N: <title>`

After all fixes are applied:

1. Print a summary: `[CodeGuard] Fixed N finding(s). Run tests to verify.`
2. If the project has a test suite, ask the user if they want to run tests now.
