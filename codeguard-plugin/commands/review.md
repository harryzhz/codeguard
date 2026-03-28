# /codeguard:review

Run an on-demand code review of the current git diff.

---

## Command Definition

- **Name**: `review`
- **Prefix**: `codeguard`
- **Full command**: `/codeguard:review`
- **Description**: Triggers the CodeGuard ReviewAgent to review the current uncommitted changes (staged and unstaged git diff).

---

## Behavior

When the user invokes `/codeguard:review`, perform the following steps:

### 1. Set Review Scope

Set the environment variable:

```
CODEGUARD_REVIEW_SCOPE=diff
```

This tells the ReviewAgent to review only the current git diff, not the full task scope.

### 2. Check for Changes

Run `git diff --name-only` and `git diff --cached --name-only` to determine if there are any changes to review.

If there are **no changes**:
- Print: `[CodeGuard] No changes detected. Nothing to review.`
- Exit without launching the ReviewAgent.

If there are changes:
- Print: `[CodeGuard] Reviewing N changed file(s)...`
- List the changed files.

### 3. Launch ReviewAgent

Launch the `review-agent` sub-agent with:

- `CODEGUARD_REVIEW_SCOPE` set to `diff`
- All configured skills enabled (general-review, security-review, performance-review, output-format)

### 4. Output

The ReviewAgent will produce a JSON report. After the ReviewAgent completes:

- Display a summary line: `[CodeGuard] Review complete. X critical, Y warning, Z style findings.`
- If there are critical findings, display them inline with their titles and file locations.
- The full JSON report is available for the upload hook to process.

---

## Usage Examples

```
/codeguard:review
```

Review all uncommitted changes (staged + unstaged).

---

## Notes

- This command is complementary to the automatic post-task review hook. Use it when you want a review before completing your task.
- The ReviewAgent operates in read-only mode and will not modify any files.
- Review results follow the same output format schema as automatic reviews.
