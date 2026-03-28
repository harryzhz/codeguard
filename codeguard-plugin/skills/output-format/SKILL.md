---
name: output-format
description: Defines the JSON output schema for ReviewAgent structured reports
disable-model-invocation: true
---

# CodeGuard Output Format Skill

This skill defines the exact JSON schema that the ReviewAgent must produce as its final output. Every review — regardless of scope or findings — must conform to this schema.

---

## JSON Schema

```json
{
  "version": "1.0",
  "project": "<string>",
  "title": "<string>",
  "review_id": "<uuid>",
  "timestamp": "<ISO8601>",
  "summary": {
    "files_reviewed": "<int>",
    "total_findings": "<int>",
    "critical": "<int>",
    "warning": "<int>",
    "style": "<int>",
    "tests_run": "<bool>",
    "tests_passed": "<int>",
    "tests_failed": "<int>"
  },
  "files_changed": ["<string>"],
  "findings": [
    {
      "id": "<uuid>",
      "severity": "critical|warning|style",
      "confidence": "<float 0.0-1.0>",
      "title": "<string>",
      "description": "<string>",
      "category": "logic|security|performance|style",
      "evidence_chain": [
        {
          "step": "<int>",
          "file": "<string>",
          "line": "<int>",
          "snippet": "<string>",
          "observation": "<string>"
        }
      ],
      "test_verification": {
        "status": "passed|failed|no_coverage",
        "test_name": "<string>",
        "output": "<string>"
      },
      "suggestion": "<string>"
    }
  ]
}
```

---

## Field Definitions

### Top-Level Fields

| Field        | Type   | Required | Description                                                              |
|--------------|--------|----------|--------------------------------------------------------------------------|
| `version`    | string | Yes      | Schema version. Always `"1.0"` for this version.                        |
| `project`    | string | Yes      | Project name derived from the git remote or directory name.              |
| `title`      | string | Yes      | A concise 1-2 sentence human-readable summary of the review findings.   |
| `review_id`  | string | Yes      | A UUID v4 uniquely identifying this review.                              |
| `timestamp`  | string | Yes      | ISO 8601 timestamp of when the review was produced (e.g., `2025-01-15T14:30:00Z`). |
| `summary`    | object | Yes      | Aggregated counts of the review results.                                 |
| `files_changed` | array | Yes   | List of file paths that were reviewed.                                   |
| `findings`   | array  | Yes      | Array of finding objects. May be empty if no issues were found.          |

### Summary Fields

| Field            | Type | Required | Description                                               |
|------------------|------|----------|-----------------------------------------------------------|
| `files_reviewed` | int  | Yes      | Number of files analyzed.                                 |
| `total_findings` | int  | Yes      | Total count of findings (must equal `critical + warning + style`). |
| `critical`       | int  | Yes      | Number of critical-severity findings.                     |
| `warning`        | int  | Yes      | Number of warning-severity findings.                      |
| `style`          | int  | Yes      | Number of style-severity findings.                        |
| `tests_run`      | bool | Yes      | Whether tests were executed during the review.            |
| `tests_passed`   | int  | Yes      | Number of tests that passed (0 if `tests_run` is false).  |
| `tests_failed`   | int  | Yes      | Number of tests that failed (0 if `tests_run` is false).  |

### Finding Fields

| Field              | Type   | Required | Description                                                         |
|--------------------|--------|----------|---------------------------------------------------------------------|
| `id`               | string | Yes      | UUID v4 uniquely identifying this finding.                          |
| `severity`         | string | Yes      | One of: `critical`, `warning`, `style`.                             |
| `confidence`       | float  | Yes      | Confidence score between 0.0 and 1.0.                               |
| `title`            | string | Yes      | Short, descriptive title (max 100 characters).                      |
| `description`      | string | Yes      | Detailed explanation of the issue.                                  |
| `category`         | string | Yes      | One of: `logic`, `security`, `performance`, `style`.                |
| `evidence_chain`   | array  | Yes      | Ordered list of evidence steps (minimum 1 step).                    |
| `test_verification`| object | Yes      | Test verification status for this finding.                          |
| `suggestion`       | string | Yes      | A concrete suggestion for how to fix the issue.                     |

### Evidence Chain Step Fields

| Field         | Type   | Required | Description                                                    |
|---------------|--------|----------|----------------------------------------------------------------|
| `step`        | int    | Yes      | Sequential step number starting from 1.                        |
| `file`        | string | Yes      | File path (project-relative preferred).                        |
| `line`        | int    | Yes      | Line number where the evidence is located.                     |
| `snippet`     | string | Yes      | Exact code snippet from the file (1-5 lines).                  |
| `observation` | string | Yes      | Explanation of what this step demonstrates.                    |

### Test Verification Fields

| Field       | Type   | Required | Description                                                      |
|-------------|--------|----------|------------------------------------------------------------------|
| `status`    | string | Yes      | One of: `passed`, `failed`, `no_coverage`.                       |
| `test_name` | string | Yes      | Name of the relevant test (empty string if `no_coverage`).       |
| `output`    | string | Yes      | Relevant test output (empty string if `no_coverage` or `passed`).|

---

## Field Rules

### Project Name Derivation

Derive the project name using this priority order:

1. Parse the git remote URL: extract the repository name (e.g., `origin` -> `github.com/org/my-project` -> `my-project`).
2. If no git remote is available, use the name of the root directory of the project.
3. Strip any `.git` suffix.

### Finding Ordering

Findings in the `findings` array must be ordered as follows:

1. **Primary sort**: By severity — `critical` first, then `warning`, then `style`.
2. **Secondary sort**: By confidence — descending (highest confidence first within each severity group).

### Severity-Confidence Enforcement

- A finding with severity `critical` must have `confidence >= 0.85`. If the confidence is below 0.85, downgrade to `warning`.
- A finding with severity `warning` must have `confidence >= 0.6`. If the confidence is below 0.6, downgrade to `style`.
- `style` findings have no minimum confidence threshold.

### Empty Review Handling

If no issues are found, produce a valid report with:

- `summary.total_findings` set to `0`
- `summary.critical`, `summary.warning`, `summary.style` all set to `0`
- `findings` set to an empty array `[]`
- All other fields populated normally

An empty review is a valid and expected outcome. Do not fabricate findings to fill the report.

### JSON Validity

- The output must be a single JSON object.
- No trailing commas.
- All strings must be properly escaped.
- No comments in the JSON output.
- No wrapping markdown code fences — output raw JSON only.
