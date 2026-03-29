#!/usr/bin/env python3
"""
validate-review.py

Validates .codeguard/last-review.json against the CodeGuard review schema.
Prints "OK" on success, or a list of errors on failure (exit code 1).

Usage: python3 validate-review.py [path/to/review.json]
       Defaults to .codeguard/last-review.json if no argument given.
"""

import json
import sys

VALID_SEVERITIES = {"critical", "warning", "style"}
VALID_CATEGORIES = {"logic", "security", "performance", "style"}
VALID_TEST_STATUSES = {"passed", "failed", "no_coverage"}

REQUIRED_TOP_LEVEL_FIELDS = {"project", "title", "summary", "files_changed", "findings"}
REQUIRED_SUMMARY_FIELDS = {"files_reviewed", "total_findings", "critical", "warning", "style", "tests_run"}
REQUIRED_FINDING_FIELDS = {
    "severity", "confidence", "title", "description",
    "category", "evidence_chain", "suggestion", "test_verification",
}
REQUIRED_EVIDENCE_FIELDS = {"step", "file", "line", "snippet", "observation"}
REQUIRED_TEST_VERIFICATION_FIELDS = {"status", "test_name", "output"}


def validate_review(data):
    errors = []

    if not isinstance(data, dict):
        return ["Root element must be a JSON object"]

    for field in REQUIRED_TOP_LEVEL_FIELDS:
        if field not in data:
            errors.append(f"Missing top-level field: '{field}'")

    if "project" in data:
        if not isinstance(data["project"], str) or not data["project"].strip():
            errors.append("'project' must be a non-empty string")

    if "title" in data and not isinstance(data["title"], str):
        errors.append("'title' must be a string")

    if "files_changed" in data and not isinstance(data["files_changed"], list):
        errors.append("'files_changed' must be an array")

    if "summary" in data:
        summary = data["summary"]
        if not isinstance(summary, dict):
            errors.append("'summary' must be an object")
        else:
            for field in REQUIRED_SUMMARY_FIELDS:
                if field not in summary:
                    errors.append(f"Missing summary field: '{field}'")

    if "findings" in data:
        if not isinstance(data["findings"], list):
            errors.append("'findings' must be an array")
        else:
            for i, finding in enumerate(data["findings"]):
                prefix = f"findings[{i}]"
                if not isinstance(finding, dict):
                    errors.append(f"{prefix}: must be an object")
                    continue

                for field in REQUIRED_FINDING_FIELDS:
                    if field not in finding:
                        errors.append(f"{prefix}: missing field '{field}'")

                if "severity" in finding and finding["severity"] not in VALID_SEVERITIES:
                    errors.append(
                        f"{prefix}: invalid severity '{finding['severity']}', "
                        f"must be one of {sorted(VALID_SEVERITIES)}"
                    )

                if "confidence" in finding:
                    conf = finding["confidence"]
                    if not isinstance(conf, (int, float)):
                        errors.append(f"{prefix}: 'confidence' must be a number")
                    elif not (0.0 <= conf <= 1.0):
                        errors.append(f"{prefix}: 'confidence' must be between 0.0 and 1.0")

                if "category" in finding and finding["category"] not in VALID_CATEGORIES:
                    errors.append(
                        f"{prefix}: invalid category '{finding['category']}', "
                        f"must be one of {sorted(VALID_CATEGORIES)}"
                    )

                if "evidence_chain" in finding:
                    chain = finding["evidence_chain"]
                    if not isinstance(chain, list):
                        errors.append(f"{prefix}: 'evidence_chain' must be an array")
                    elif len(chain) == 0:
                        errors.append(f"{prefix}: 'evidence_chain' must have at least 1 step")
                    else:
                        for j, step in enumerate(chain):
                            step_prefix = f"{prefix}.evidence_chain[{j}]"
                            if not isinstance(step, dict):
                                errors.append(f"{step_prefix}: must be an object, not a string")
                                continue
                            for field in REQUIRED_EVIDENCE_FIELDS:
                                if field not in step:
                                    errors.append(f"{step_prefix}: missing field '{field}'")

                if "test_verification" in finding:
                    tv = finding["test_verification"]
                    if not isinstance(tv, dict):
                        errors.append(f"{prefix}: 'test_verification' must be an object")
                    else:
                        for field in REQUIRED_TEST_VERIFICATION_FIELDS:
                            if field not in tv:
                                errors.append(f"{prefix}.test_verification: missing field '{field}'")
                        if "status" in tv and tv["status"] not in VALID_TEST_STATUSES:
                            errors.append(
                                f"{prefix}.test_verification: invalid status '{tv['status']}', "
                                f"must be one of {sorted(VALID_TEST_STATUSES)}"
                            )

    return errors


def main():
    file_path = sys.argv[1] if len(sys.argv) > 1 else ".codeguard/last-review.json"

    try:
        with open(file_path) as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    errors = validate_review(data)

    if errors:
        print(f"VALIDATION FAILED ({len(errors)} error(s)):")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    else:
        print("OK")


if __name__ == "__main__":
    main()
