#!/usr/bin/env bash
set -euo pipefail

REPO="${BETTER_CODEX_REPO:-Ericwong5021/better-codex}"
BIN_DIR="${BETTER_CODEX_BIN_DIR:-$HOME/.local/bin}"

if [[ ! "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo "Invalid Better Codex repository name." >&2
  exit 1
fi

INSTALLER_URL="https://raw.githubusercontent.com/$REPO/main/scripts/install.sh"
curl -fsSL --connect-timeout 15 --max-time 60 --retry 2 --retry-delay 1 "$INSTALLER_URL" \
  | env BETTER_CODEX_REPO="$REPO" /bin/bash

"$BIN_DIR/better-codex" update --channel preview
"$BIN_DIR/better-codex" update channel preview
