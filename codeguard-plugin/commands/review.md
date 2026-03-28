---
name: review
description: Run CodeGuard code review on uncommitted changes
---

Run a CodeGuard code review on the current uncommitted changes.

## Steps

1. Run `git diff --name-only` and `git diff --staged --name-only` to find changed files.
2. If no changes found, tell the user "No uncommitted changes to review."
3. If changes exist, launch the `review-agent` sub-agent to review the changed files. Set environment variable `CODEGUARD_REVIEW_SCOPE=diff`.
4. After the review agent completes, display its JSON output as a formatted review summary.
