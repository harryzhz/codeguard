#!/usr/bin/env python3
"""
fix-review.py

Auto-fixes common structural issues in ~/.codeguard/<project>/last-review.json
to conform to the CodeGuard review schema. Overwrites the file in place.

Usage: python3 fix-review.py [path/to/review.json]
       Defaults to ~/.codeguard/<project>/last-review.json if no argument given.
"""

import json
import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone

VALID_SEVERITIES = {"critical", "warning", "style"}
VALID_CATEGORIES = {"logic", "security", "performance", "style"}

CATEGORY_MAP = {
    "bug": "logic",
    "error": "logic",
    "architecture": "logic",
    "design": "logic",
    "quality": "style",
    "readability": "style",
    "naming": "style",
    "formatting": "style",
    "efficiency": "performance",
    "memory": "performance",
    "complexity": "performance",
}

DEFAULT_CONFIDENCE = {
    "critical": 0.9,
    "warning": 0.7,
    "style": 0.5,
}

DEFAULT_TEST_VERIFICATION = {
    "status": "no_coverage",
    "test_name": "",
    "output": "",
}


def detect_project_name():
    """Derive project name from git remote or directory basename."""
    try:
        url = subprocess.check_output(
            ["git", "remote", "get-url", "origin"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        name = url.rstrip("/").rsplit("/", 1)[-1]
        return name.removesuffix(".git")
    except Exception:
        return os.path.basename(os.getcwd())


def fix_evidence_chain(chain):
    """Convert evidence_chain entries to proper object format."""
    if not isinstance(chain, list):
        return [{"step": 1, "file": "", "line": 0, "snippet": str(chain), "observation": str(chain)}]

    fixed = []
    for i, entry in enumerate(chain):
        if isinstance(entry, str):
            file_path = ""
            line = 0
            parts = entry.split(":", 1)
            if len(parts) == 2:
                candidate_path = parts[0].strip()
                rest = parts[1]
                line_parts = rest.split(None, 1)
                if line_parts and line_parts[0].isdigit():
                    file_path = candidate_path
                    line = int(line_parts[0])
            fixed.append({
                "step": i + 1,
                "file": file_path,
                "line": line,
                "snippet": entry,
                "observation": entry,
            })
        elif isinstance(entry, dict):
            entry.setdefault("step", i + 1)
            entry.setdefault("file", "")
            entry.setdefault("line", 0)
            entry.setdefault("snippet", "")
            entry.setdefault("observation", "")
            fixed.append(entry)
        else:
            fixed.append({
                "step": i + 1, "file": "", "line": 0,
                "snippet": str(entry), "observation": str(entry),
            })
    return fixed if fixed else [{"step": 1, "file": "", "line": 0, "snippet": "", "observation": ""}]


def fix_finding(finding):
    """Fix a single finding to conform to the schema."""
    if not isinstance(finding, dict):
        return None

    severity = finding.get("severity", "style")
    if severity not in VALID_SEVERITIES:
        severity = "style"
    finding["severity"] = severity

    category = finding.get("category", "logic")
    if category not in VALID_CATEGORIES:
        category = CATEGORY_MAP.get(category, "logic")
    finding["category"] = category

    if "confidence" not in finding or not isinstance(finding.get("confidence"), (int, float)):
        finding["confidence"] = DEFAULT_CONFIDENCE.get(severity, 0.5)
    else:
        finding["confidence"] = max(0.0, min(1.0, float(finding["confidence"])))

    finding.setdefault("title", "Untitled finding")
    finding.setdefault("description", "")
    finding.setdefault("suggestion", "")

    chain_key = None
    for key in ("evidence_chain", "evidence"):
        if key in finding:
            chain_key = key
            break

    if chain_key:
        finding["evidence_chain"] = fix_evidence_chain(finding[chain_key])
        if chain_key != "evidence_chain":
            del finding[chain_key]
    else:
        finding["evidence_chain"] = [
            {"step": 1, "file": "", "line": 0, "snippet": "", "observation": ""}
        ]

    tv = finding.get("test_verification")
    if not isinstance(tv, dict):
        finding["test_verification"] = dict(DEFAULT_TEST_VERIFICATION)
    else:
        tv.setdefault("status", "no_coverage")
        tv.setdefault("test_name", "")
        tv.setdefault("output", "")

    return finding


def fix_review(data):
    """Fix the review JSON to conform to the schema. Returns (fixed_data, fixes_applied)."""
    if not isinstance(data, dict):
        data = {}

    fixes = []

    if not data.get("project") or not isinstance(data.get("project"), str):
        data["project"] = detect_project_name()
        fixes.append(f"Set project to '{data['project']}'")

    if "title" not in data or not isinstance(data.get("title"), str):
        data["title"] = ""
        fixes.append("Added empty title")

    if "timestamp" not in data:
        data["timestamp"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        fixes.append("Added timestamp")

    files_changed = data.get("files_changed")
    if not isinstance(files_changed, list):
        files_reviewed = data.get("files_reviewed")
        if isinstance(files_reviewed, list):
            data["files_changed"] = files_reviewed
            fixes.append("Renamed files_reviewed to files_changed")
        else:
            data["files_changed"] = []
            fixes.append("Added empty files_changed")

    findings = data.get("findings")
    if not isinstance(findings, list):
        data["findings"] = []
        fixes.append("Added empty findings array")
    else:
        fixed_findings = []
        for i, f in enumerate(findings):
            fixed = fix_finding(f)
            if fixed:
                fixed_findings.append(fixed)
            else:
                fixes.append(f"Removed invalid finding at index {i}")
        if len(fixed_findings) != len(findings):
            fixes.append(f"Fixed {len(findings)} findings -> {len(fixed_findings)}")
        data["findings"] = fixed_findings

    counts = {"critical": 0, "warning": 0, "style": 0}
    for f in data["findings"]:
        sev = f.get("severity", "style")
        if sev in counts:
            counts[sev] += 1

    summary = data.get("summary")
    if not isinstance(summary, dict):
        data["summary"] = {
            "files_reviewed": len(data["files_changed"]),
            "total_findings": len(data["findings"]),
            "critical": counts["critical"],
            "warning": counts["warning"],
            "style": counts["style"],
            "tests_run": False,
            "tests_passed": 0,
            "tests_failed": 0,
        }
        fixes.append("Generated summary from findings")
    else:
        summary.setdefault("files_reviewed", len(data["files_changed"]))
        summary.setdefault("total_findings", len(data["findings"]))
        summary.setdefault("critical", counts["critical"])
        summary.setdefault("warning", counts["warning"])
        summary.setdefault("style", counts["style"])
        summary.setdefault("tests_run", False)
        summary.setdefault("tests_passed", 0)
        summary.setdefault("tests_failed", 0)

    if not data["title"]:
        total = len(data["findings"])
        n_files = len(data["files_changed"])
        if total == 0:
            data["title"] = f"审查 {n_files} 个文件，代码质量良好，未发现问题"
        else:
            parts = []
            if counts["critical"] > 0:
                parts.append(f"{counts['critical']} 个 critical")
            if counts["warning"] > 0:
                parts.append(f"{counts['warning']} 个 warning")
            if counts["style"] > 0:
                parts.append(f"{counts['style']} 个 style")
            data["title"] = f"审查 {n_files} 个文件，发现 {', '.join(parts)} 问题"
        fixes.append(f"Generated title: {data['title']}")

    return data, fixes


def default_review_path():
    """Return the default review file path: ~/.codeguard/<project>/last-review.json."""
    project = detect_project_name()
    return os.path.expanduser(f"~/.codeguard/{project}/last-review.json")


def main():
    file_path = sys.argv[1] if len(sys.argv) > 1 else default_review_path()

    try:
        with open(file_path) as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON, cannot auto-fix: {e}", file=sys.stderr)
        sys.exit(1)

    fixed_data, fixes = fix_review(data)

    if not fixes:
        print("OK (no fixes needed)")
        return

    with open(file_path, "w") as f:
        json.dump(fixed_data, f, indent=2, ensure_ascii=False)

    print(f"FIXED ({len(fixes)} fix(es) applied):")
    for fix in fixes:
        print(f"  - {fix}")


if __name__ == "__main__":
    main()
