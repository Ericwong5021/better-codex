#!/usr/bin/env bash
set -euo pipefail

directory="$(tr -d '\r\n' < /etc/better-codex/updater-directory)"
state_directory="/var/lib/better-codex-updater"
request="$state_directory/request"
running="$state_directory/request.running"
lock="$state_directory/request.lock"
state="$state_directory/state.json"

[ -d "$directory/.git" ] || exit 1
if [ ! -f "$running" ]; then
  [ -f "$request" ] || exit 0
  mv "$request" "$running"
fi
target="$(tr -d '\r\n' < "$running")"
write_state() {
  local temporary
  temporary="$(mktemp "$state_directory/state.XXXXXX")"
  printf '%s\n' "$1" > "$temporary"
  chmod 644 "$temporary"
  mv -f "$temporary" "$state"
}
[[ "$target" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-beta\.[0-9]+)?$ ]] || {
  write_state "{\"status\":\"error\",\"targetVersion\":\"\",\"updatedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"error\":\"update_version_invalid\"}"
  rm -f "$running" "$lock"
  exit 1
}

write_state "{\"status\":\"installing\",\"targetVersion\":\"$target\",\"updatedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"error\":null}"
rm -f "$lock"
if BETTER_CODEX_SELFHOST_DIR="$directory" bash /usr/local/libexec/better-codex-selfhost upgrade vps "$target"; then
  write_state "{\"status\":\"current\",\"targetVersion\":\"$target\",\"currentVersion\":\"${target#v}\",\"updatedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"error\":null}"
  rm -f "$running"
  exit 0
fi
write_state "{\"status\":\"error\",\"targetVersion\":\"$target\",\"updatedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"error\":\"update_install_failed\"}"
rm -f "$running" "$lock"
exit 1
