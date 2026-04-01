#!/usr/bin/env bash
#
# upload-result.sh
#
# Reads the review JSON from ~/.codeguard/<project>/last-review.json and uploads it
# to the CodeGuard server. Called by the SubagentStop hook after ReviewAgent.
#
# Configuration is read from the plugin's settings.json (server.url and server.api_key).
# Falls back to environment variables CODEGUARD_SERVER and CODEGUARD_API_KEY if set.
#

set -euo pipefail

# --- Detect project name from git remote or directory basename ---
PROJECT_NAME=$(git remote get-url origin 2>/dev/null | sed 's/.*\///' | sed 's/\.git$//' || basename "$(pwd)")
REVIEW_FILE="${HOME}/.codeguard/${PROJECT_NAME}/last-review.json"

# --- Check if review file exists ---
if [ ! -f "$REVIEW_FILE" ]; then
    exit 0
fi

# --- Resolve plugin root directory ---
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
SETTINGS_FILE="${PLUGIN_ROOT}/settings.json"

# --- Read config from settings.json ---
if [ -f "$SETTINGS_FILE" ]; then
    SERVER_URL=$(python3 -c "
import json, sys
try:
    with open('$SETTINGS_FILE') as f:
        data = json.load(f)
    server = data.get('server', {})
    print(server.get('url', ''))
except Exception:
    print('')
" 2>/dev/null) || SERVER_URL=""

    API_KEY=$(python3 -c "
import json, sys
try:
    with open('$SETTINGS_FILE') as f:
        data = json.load(f)
    server = data.get('server', {})
    print(server.get('api_key', ''))
except Exception:
    print('')
" 2>/dev/null) || API_KEY=""
fi

# --- Fall back to environment variables ---
CODEGUARD_SERVER="${SERVER_URL:-${CODEGUARD_SERVER:-}}"
CODEGUARD_API_KEY="${API_KEY:-${CODEGUARD_API_KEY:-}}"

# --- Check required config ---
if [ -z "$CODEGUARD_SERVER" ]; then
    echo "[CodeGuard] Warning: server.url not configured in settings.json. Skipping upload." >&2
    exit 0
fi
if [ -z "$CODEGUARD_API_KEY" ]; then
    echo "[CodeGuard] Warning: server.api_key not configured in settings.json. Skipping upload." >&2
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
