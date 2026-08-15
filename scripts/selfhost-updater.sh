#!/usr/bin/env bash
set -euo pipefail

directory="$(tr -d '\r\n' < /etc/better-codex/updater-directory)"
state_directory="/var/lib/better-codex-updater"
request="$state_directory/request"
running="$state_directory/request.running"
lock="$state_directory/request.lock"
state="$state_directory/state.json"

[ -d "$directory/.git" ] || exit 1
[ -f "$request" ] || exit 0
mv "$request" "$running"
target="$(tr -d '\r\n' < "$running")"
rm -f "$running"
[[ "$target" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  printf '{"status":"error","targetVersion":"","updatedAt":"%s","error":"update_version_invalid"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$state"
  chmod 644 "$state"
  rm -f "$lock"
  exit 1
}

printf '{"status":"installing","targetVersion":"%s","updatedAt":"%s","error":null}\n' "$target" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$state"
chmod 644 "$state"
rm -f "$lock"
if BETTER_CODEX_SELFHOST_DIR="$directory" bash /usr/local/libexec/better-codex-selfhost upgrade vps "$target"; then
  printf '{"status":"current","targetVersion":"%s","currentVersion":"%s","updatedAt":"%s","error":null}\n' "$target" "${target#v}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$state"
  chmod 644 "$state"
  exit 0
fi
printf '{"status":"error","targetVersion":"%s","updatedAt":"%s","error":"update_install_failed"}\n' "$target" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$state"
chmod 644 "$state"
exit 1
