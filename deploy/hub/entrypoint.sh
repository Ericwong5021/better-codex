#!/bin/sh
set -eu

if [ -n "${BETTER_CODEX_RELAY_BOOTSTRAP_SECRET_FILE:-}" ]; then
  install -o node -g node -m 0400 "$BETTER_CODEX_RELAY_BOOTSTRAP_SECRET_FILE" /tmp/better-codex-bootstrap-secret
  export BETTER_CODEX_RELAY_BOOTSTRAP_SECRET_FILE=/tmp/better-codex-bootstrap-secret
fi

if [ -n "${BETTER_CODEX_RELAY_WEB_PASSWORD_FILE:-}" ]; then
  install -o node -g node -m 0400 "$BETTER_CODEX_RELAY_WEB_PASSWORD_FILE" /tmp/better-codex-web-password
  export BETTER_CODEX_RELAY_WEB_PASSWORD_FILE=/tmp/better-codex-web-password
fi

exec setpriv --reuid=node --regid=node --init-groups "$@"
