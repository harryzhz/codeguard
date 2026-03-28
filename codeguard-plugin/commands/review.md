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
5. If the user selects "Skip for now", print "[CodeGuard] Review complete. Findings saved to .codeguard/last-review.json" and stop.

### Phase 3: Fix Selected Findings

For each selected finding:

1. Read the finding's file, evidence chain, and suggestion from the JSON.
2. Apply the fix described in the suggestion. Use your judgment — the suggestion is guidance, not a literal patch.
3. After fixing, print: `[CodeGuard] Fixed #N: <title>`

After all fixes are applied:

1. Print a summary: `[CodeGuard] Fixed N finding(s). Run tests to verify.`
2. If the project has a test suite, ask the user if they want to run tests now.
