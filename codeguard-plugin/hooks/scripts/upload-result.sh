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

# --- Load env vars from .env if not already set ---
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        # Extract key (everything before first =)
        key="${line%%=*}"
        key="${key// /}"
        # Extract value (everything after first =)
        value="${line#*=}"
        # Strip surrounding quotes
        value="${value#\"}" ; value="${value%\"}"
        value="${value#\'}" ; value="${value%\'}"
        # Only set if not already in environment
        if [ -z "${!key:-}" ]; then
            export "$key=$value"
        fi
    done < "$ENV_FILE"
fi

# --- Check required env vars ---
if [ -z "${CODEGUARD_SERVER:-}" ]; then
    echo "[CodeGuard] Warning: CODEGUARD_SERVER not set. Skipping upload." >&2
    exit 0
fi
if [ -z "${CODEGUARD_API_KEY:-}" ]; then
    echo "[CodeGuard] Warning: CODEGUARD_API_KEY not set. Skipping upload." >&2
    exit 0
fi

# --- Extract project name ---
PROJECT=$(python3 -c "
import json, sys
try:
    with open('$REVIEW_FILE') as f:
        data = json.load(f)
    print(data.get('project', 'unknown'))
except Exception as e:
    print(f'ERROR: {e}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null) || exit 0

# --- Upload ---
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${CODEGUARD_API_KEY}" \
    -d @"$REVIEW_FILE" \
    "${CODEGUARD_SERVER}/api/v1/projects/${PROJECT}/reviews" 2>/dev/null) || exit 0

HTTP_BODY=$(echo "$HTTP_RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -n 1)

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ] 2>/dev/null; then
    VERSION=$(echo "$HTTP_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin)['version'])" 2>/dev/null)
    REPORT_URL="${CODEGUARD_SERVER}/projects/${PROJECT}/reviews/${VERSION}"
    echo "[CodeGuard] Report uploaded → ${REPORT_URL}"
else
    echo "[CodeGuard] Upload failed (HTTP ${HTTP_STATUS}): ${HTTP_BODY}" >&2
fi
