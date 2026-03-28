#!/usr/bin/env bash
#
# upload-result.sh
#
# Reads the review JSON from .codeguard/last-review.json and uploads it
# to the CodeGuard server. Called by the SubagentStop hook after ReviewAgent.
#
# Required environment variables:
#   CODEGUARD_SERVER   - Base URL of the CodeGuard server
#   CODEGUARD_API_KEY  - API key for authentication
#

set -euo pipefail

REVIEW_FILE=".codeguard/last-review.json"

# --- Check if review file exists ---
if [ ! -f "$REVIEW_FILE" ]; then
    exit 0
fi

# --- Check required env vars ---
if [ -z "${CODEGUARD_SERVER:-}" ] || [ -z "${CODEGUARD_API_KEY:-}" ]; then
    exit 0
fi

# --- Extract metadata ---
METADATA=$(python3 -c "
import json, sys
try:
    with open('$REVIEW_FILE') as f:
        data = json.load(f)
    project = data.get('project', 'unknown')
    review_id = data.get('review_id', 'unknown')
    s = data.get('summary', {})
    print(f\"{project}|{review_id}|{s.get('critical',0)}|{s.get('warning',0)}|{s.get('style',0)}\")
except Exception as e:
    print(f'ERROR: {e}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null) || exit 0

IFS='|' read -r PROJECT REVIEW_ID CRITICAL WARNING STYLE <<< "$METADATA"

# --- Upload ---
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${CODEGUARD_API_KEY}" \
    -d @"$REVIEW_FILE" \
    "${CODEGUARD_SERVER}/api/v1/reviews/" 2>/dev/null) || exit 0

HTTP_BODY=$(echo "$HTTP_RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -n 1)

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ] 2>/dev/null; then
    REPORT_URL="${CODEGUARD_SERVER}/projects/${PROJECT}/reviews/${REVIEW_ID}"
    echo "[CodeGuard] Report uploaded → ${REPORT_URL}"
fi
