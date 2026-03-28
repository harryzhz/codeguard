---
allowed-tools: Agent, Bash, Read, Grep, Glob
description: Run CodeGuard code review on all uncommitted changes
---

Run a CodeGuard code review on the current uncommitted changes.

## Steps

1. Run `git diff --name-only` and `git diff --staged --name-only` to find changed files.
2. If no changes found, tell the user "[CodeGuard] No uncommitted changes to review." and stop.
3. If changes exist, print "[CodeGuard] Reviewing N changed file(s)..." and list them.
4. Launch the `review-agent` sub-agent to review the changed files. Pass environment variable `CODEGUARD_REVIEW_SCOPE=diff`.
5. After the review agent completes, display a summary: number of critical/warning/style findings, and show critical findings inline with their titles and evidence.
