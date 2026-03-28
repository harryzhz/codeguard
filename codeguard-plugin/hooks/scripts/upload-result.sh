#!/usr/bin/env bash
#
# upload-result.sh
#
# Uploads the CodeGuard review JSON report to the CodeGuard server.
# Expected to be called by the SubagentStop hook after the ReviewAgent completes.
#
# Required environment variables:
#   CODEGUARD_SERVER   - Base URL of the CodeGuard server (e.g., https://codeguard.example.com)
#   CODEGUARD_API_KEY  - API key for authentication
#   CLAUDE_AGENT_OUTPUT - The JSON output produced by the ReviewAgent
#

set -euo pipefail

# --- Validate required environment variables ---

if [ -z "${CODEGUARD_SERVER:-}" ]; then
    echo "[CodeGuard] Error: CODEGUARD_SERVER is not set. Skipping upload." >&2
    exit 1
fi

if [ -z "${CODEGUARD_API_KEY:-}" ]; then
    echo "[CodeGuard] Error: CODEGUARD_API_KEY is not set. Skipping upload." >&2
    exit 1
fi

if [ -z "${CLAUDE_AGENT_OUTPUT:-}" ]; then
    echo "[CodeGuard] Error: CLAUDE_AGENT_OUTPUT is not set. No review data to upload." >&2
    exit 1
fi

# --- Extract metadata from JSON output ---

METADATA=$(python3 -c "
import json, sys

try:
    data = json.loads(sys.argv[1])
except (json.JSONDecodeError, IndexError) as e:
    print(f'ERROR: Invalid JSON in CLAUDE_AGENT_OUTPUT: {e}', file=sys.stderr)
    sys.exit(1)

project = data.get('project', 'unknown')
review_id = data.get('review_id', 'unknown')
summary = data.get('summary', {})
critical = summary.get('critical', 0)
warning = summary.get('warning', 0)
style = summary.get('style', 0)

print(f'{project}|{review_id}|{critical}|{warning}|{style}')
" "$CLAUDE_AGENT_OUTPUT")

if [ $? -ne 0 ] || [ -z "$METADATA" ]; then
    echo "[CodeGuard] Error: Failed to parse review JSON." >&2
    exit 1
fi

IFS='|' read -r PROJECT REVIEW_ID CRITICAL WARNING STYLE <<< "$METADATA"

# --- Upload to CodeGuard server ---

UPLOAD_URL="${CODEGUARD_SERVER}/api/v1/reviews/"

HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${CODEGUARD_API_KEY}" \
    -d "$CLAUDE_AGENT_OUTPUT" \
    "$UPLOAD_URL" 2>/dev/null) || true

HTTP_BODY=$(echo "$HTTP_RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -n 1)

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ] 2>/dev/null; then
    # Try to extract report URL from response
    REPORT_URL=$(python3 -c "
import json, sys
try:
    data = json.loads(sys.argv[1])
    print(data.get('url', data.get('report_url', '${CODEGUARD_SERVER}/projects/${PROJECT}/reviews/${REVIEW_ID}')))
except Exception:
    print('${CODEGUARD_SERVER}/projects/${PROJECT}/reviews/${REVIEW_ID}')
" "$HTTP_BODY" 2>/dev/null) || REPORT_URL="${CODEGUARD_SERVER}/projects/${PROJECT}/reviews/${REVIEW_ID}"

    echo "[CodeGuard] Review complete. ${CRITICAL} critical, ${WARNING} warning, ${STYLE} style → ${REPORT_URL}"
else
    echo "[CodeGuard] Warning: Upload failed (HTTP ${HTTP_STATUS}). Review data was not saved to server." >&2
    echo "[CodeGuard] Review complete. ${CRITICAL} critical, ${WARNING} warning, ${STYLE} style (local only)."
fi
