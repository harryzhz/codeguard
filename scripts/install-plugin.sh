#!/usr/bin/env bash
#
# install-plugin.sh
#
# Installs the CodeGuard plugin for Claude Code.
# Handles a known cache issue where marketplace-based installation
# may not copy all plugin files to the versioned cache directory.
#
# Usage: bash <(curl -s https://raw.githubusercontent.com/harryzhz/codeguard/main/scripts/install-plugin.sh)
#

set -euo pipefail

MARKETPLACE_NAME="codeguard"
PLUGIN_NAME="codeguard"
REPO="harryzhz/codeguard"
PLUGIN_SUBDIR="codeguard-plugin"

MARKETPLACE_DIR="${HOME}/.claude/plugins/marketplaces/${MARKETPLACE_NAME}"
CACHE_BASE="${HOME}/.claude/plugins/cache/${MARKETPLACE_NAME}/${PLUGIN_NAME}"

echo "[CodeGuard] Installing plugin..."

# --- Step 1: Clone marketplace repo if not present ---
if [ ! -d "${MARKETPLACE_DIR}/.claude-plugin" ]; then
    echo "[CodeGuard] Cloning marketplace from ${REPO}..."
    rm -rf "${MARKETPLACE_DIR}"
    git clone --depth 1 "https://github.com/${REPO}.git" "${MARKETPLACE_DIR}" 2>/dev/null
fi

# --- Step 2: Read plugin version ---
PLUGIN_JSON="${MARKETPLACE_DIR}/${PLUGIN_SUBDIR}/.claude-plugin/plugin.json"
if [ ! -f "${PLUGIN_JSON}" ]; then
    echo "[CodeGuard] Error: plugin.json not found at ${PLUGIN_JSON}" >&2
    exit 1
fi

VERSION=$(python3 -c "
import json
with open('${PLUGIN_JSON}') as f:
    print(json.load(f).get('version', '0.1.0'))
" 2>/dev/null)

CACHE_DIR="${CACHE_BASE}/${VERSION}"
SOURCE_DIR="${MARKETPLACE_DIR}/${PLUGIN_SUBDIR}"

echo "[CodeGuard] Plugin version: ${VERSION}"

# --- Step 3: Copy plugin files to versioned cache ---
echo "[CodeGuard] Syncing plugin files to cache..."
mkdir -p "${CACHE_DIR}"

for item in .claude-plugin agents commands skills hooks settings.json; do
    if [ -e "${SOURCE_DIR}/${item}" ]; then
        rm -rf "${CACHE_DIR}/${item}"
        cp -r "${SOURCE_DIR}/${item}" "${CACHE_DIR}/${item}"
    fi
done

# --- Step 4: Register marketplace in known_marketplaces.json ---
KNOWN_FILE="${HOME}/.claude/plugins/known_marketplaces.json"
if [ -f "${KNOWN_FILE}" ]; then
    python3 -c "
import json
with open('${KNOWN_FILE}') as f:
    data = json.load(f)
if '${MARKETPLACE_NAME}' not in data:
    data['${MARKETPLACE_NAME}'] = {
        'source': {'source': 'github', 'repo': '${REPO}'},
        'installLocation': '${MARKETPLACE_DIR}'
    }
    with open('${KNOWN_FILE}', 'w') as f:
        json.dump(data, f, indent=2)
    print('[CodeGuard] Marketplace registered.')
else:
    print('[CodeGuard] Marketplace already registered.')
" 2>/dev/null
fi

# --- Step 5: Enable plugin in user settings ---
SETTINGS_FILE="${HOME}/.claude/settings.json"
if [ -f "${SETTINGS_FILE}" ]; then
    python3 -c "
import json
with open('${SETTINGS_FILE}') as f:
    data = json.load(f)
plugins = data.setdefault('enabledPlugins', {})
key = '${PLUGIN_NAME}@${MARKETPLACE_NAME}'
if key not in plugins or not plugins[key]:
    plugins[key] = True
    with open('${SETTINGS_FILE}', 'w') as f:
        json.dump(data, f, indent=2)
    print('[CodeGuard] Plugin enabled in settings.')
else:
    print('[CodeGuard] Plugin already enabled.')
" 2>/dev/null
fi

# --- Step 6: Verify ---
EXPECTED_FILES=("commands/review.md" "agents/review-agent.md" "skills/general-review/SKILL.md" "hooks/hooks.json")
MISSING=0
for f in "${EXPECTED_FILES[@]}"; do
    if [ ! -f "${CACHE_DIR}/${f}" ]; then
        echo "[CodeGuard] Warning: missing ${f}" >&2
        MISSING=1
    fi
done

if [ "${MISSING}" -eq 0 ]; then
    echo "[CodeGuard] Installation complete! Restart Claude Code to activate."
    echo "[CodeGuard] Then run: /codeguard:review"
else
    echo "[CodeGuard] Installation completed with warnings. Some files may be missing." >&2
fi
