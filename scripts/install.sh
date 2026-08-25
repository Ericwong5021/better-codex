#!/usr/bin/env bash
set -euo pipefail

REPO="${BETTER_CODEX_REPO:-Ericwong5021/better-codex}"
REQUESTED_CHANNEL="${BETTER_CODEX_CHANNEL:-stable}"
BIN_DIR="${BETTER_CODEX_BIN_DIR:-$HOME/.local/bin}"
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
SKILL_DIR="$CODEX_DIR/skills/better-codex"
ISSUE_SKILL_DIR="$CODEX_DIR/skills/better-codex-issue"
BETTER_CODEX_DIR="${BETTER_CODEX_HOME:-$HOME/.better-codex}"
UPDATE_KEY_PATH="$BETTER_CODEX_DIR/update-public-key.pem"
CHANNEL_PATH="$BETTER_CODEX_DIR/runtime/channel.json"
INSTALL_LOCK_PATH="$BETTER_CODEX_DIR/install.lock"
UPDATE_KEY_SHA256="1007607762db32004da21780e81875bef8453355a2944524a96e5341e1e3963e"
MINIMUM_NODE_VERSION="22.5.0"
NODE_DOWNLOAD_URL="https://nodejs.org/en/download"
WITH_SERVICE=1

if [ "${1:-}" = "--no-service" ]; then
  WITH_SERVICE=0
elif [ -n "${1:-}" ]; then
  echo "Usage: install.sh [--no-service]" >&2
  exit 1
fi

case "$REQUESTED_CHANNEL" in
  stable|preview) ;;
  *) echo "Invalid Better Codex update channel: $REQUESTED_CHANNEL" >&2; exit 1 ;;
esac

if [ "$(uname -s)" != "Darwin" ]; then
  echo "Better Codex currently supports macOS only." >&2
  exit 1
fi

case "$(uname -m)" in
  arm64) ARCH="arm64" ;;
  x86_64) ARCH="amd64" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

node_compatible() {
  command -v node >/dev/null 2>&1 || return 1
  node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 5) ? 0 : 1)' >/dev/null 2>&1
}

ensure_node() {
  if node_compatible; then
    printf '[OK] Node.js %s detected\n' "$(node --version)"
    return
  fi
  printf '[Better Codex] Node.js v%s or later is required.\n' "$MINIMUM_NODE_VERSION"
  if [ ! -r /dev/tty ]; then
    printf 'Install Node.js from %s and run this installer again.\n' "$NODE_DOWNLOAD_URL" >&2
    exit 1
  fi
  printf 'Install Node.js now? [Y/n] ' >/dev/tty
  read -r choice </dev/tty
  if [ -n "$choice" ] && [ "$choice" != "y" ] && [ "$choice" != "Y" ]; then
    echo "Installation cancelled. Node.js was not installed."
    exit 1
  fi
  if ! command -v brew >/dev/null 2>&1; then
    open "$NODE_DOWNLOAD_URL" >/dev/null 2>&1 || true
    printf 'Automatic installation requires Homebrew. The official Node.js download page was opened; run this installer again after installation.\n' >&2
    exit 1
  fi
  printf '[Better Codex] Installing Node.js with Homebrew...\n'
  brew install node
  hash -r
  if ! node_compatible; then
    printf 'Node.js v%s or later was not detected after installation. Download it from %s and run this installer again.\n' "$MINIMUM_NODE_VERSION" "$NODE_DOWNLOAD_URL" >&2
    exit 1
  fi
  printf '[OK] Node.js %s installed\n' "$(node --version)"
}

ensure_node

resolve_preview_version() {
  local work manifest public_key version cache_bust
  work="$(mktemp -d "${TMPDIR:-/tmp}/better-codex-preview.XXXXXX")" || return 1
  manifest="$work/update-manifest.json"
  public_key="$work/update-public-key.pem"
  cache_bust="$(date +%s)"
  if ! curl -fsSL --connect-timeout 15 --max-time 60 --retry 2 --retry-delay 1 \
    "https://github.com/$REPO/releases/download/preview/update-manifest.json?better_codex_cache_bust=$cache_bust" -o "$manifest"; then
    rm -rf "$work"
    return 1
  fi
  if ! curl -fsSL --connect-timeout 15 --max-time 60 --retry 2 --retry-delay 1 \
    "https://raw.githubusercontent.com/$REPO/main/assets/update-public-key.pem?better_codex_cache_bust=$cache_bust" -o "$public_key"; then
    rm -rf "$work"
    return 1
  fi
  if [ "$(tr -d '\r' < "$public_key" | shasum -a 256 | awk '{print $1}')" != "$UPDATE_KEY_SHA256" ]; then
    rm -rf "$work"
    return 1
  fi
  if ! version="$(node -e '
    const fs = require("fs");
    const crypto = require("crypto");
    const [manifestPath, keyPath, assetKey] = process.argv.slice(1);
    const stableJson = value => Array.isArray(value)
      ? `[${value.map(stableJson).join(",")}]`
      : value && typeof value === "object"
        ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`
        : JSON.stringify(value);
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const payload = manifest.payload;
      const asset = payload?.core?.assets?.[assetKey];
      if (payload?.schemaVersion !== 1 || payload?.channel !== "preview" || typeof manifest.signature !== "string") process.exit(1);
      if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*)?$/.test(payload.core?.version || "")) process.exit(1);
      if (!asset || typeof asset.url !== "string" || !asset.url.startsWith("https://") || !/^[a-f0-9]{64}$/i.test(asset.sha256 || "")) process.exit(1);
      const valid = crypto.verify(null, Buffer.from(stableJson(payload)), fs.readFileSync(keyPath), Buffer.from(manifest.signature, "base64"));
      if (!valid) process.exit(1);
      process.stdout.write(payload.core.version);
    } catch {
      process.exit(1);
    }
  ' "$manifest" "$public_key" "darwin-$ARCH")"; then
    rm -rf "$work"
    return 1
  fi
  rm -rf "$work"
  printf '%s' "$version"
}

verify_update_key() {
  [ -n "$UPDATE_PUBLIC_KEY" ] && [ -f "$UPDATE_PUBLIC_KEY" ] && [ "$(tr -d '\r' < "$UPDATE_PUBLIC_KEY" | shasum -a 256 | awk '{print $1}')" = "$UPDATE_KEY_SHA256" ]
}

verify_checksums_signature() {
  [ -n "$CHECKSUM_SIGNATURE" ] && [ -f "$CHECKSUM_SIGNATURE" ] && node -e 'const fs=require("fs"),crypto=require("crypto"); const [checksums,key,signature]=process.argv.slice(1); process.exit(crypto.verify(null,fs.readFileSync(checksums),fs.readFileSync(key),Buffer.from(fs.readFileSync(signature,"utf8").trim(),"base64"))?0:1)' "$CHECKSUMS" "$UPDATE_PUBLIC_KEY" "$CHECKSUM_SIGNATURE"
}

acquire_install_lock() {
  mkdir -p "$BETTER_CODEX_DIR"
  if mkdir "$INSTALL_LOCK_PATH" 2>/dev/null; then
    printf '%s' "$$" > "$INSTALL_LOCK_PATH/pid"
    return
  fi
  local owner=""
  [ -f "$INSTALL_LOCK_PATH/pid" ] && owner="$(cat "$INSTALL_LOCK_PATH/pid" 2>/dev/null || true)"
  if [ -n "$owner" ] && kill -0 "$owner" 2>/dev/null; then
    echo "Another Better Codex installation is already running." >&2
    exit 1
  fi
  rm -f "$INSTALL_LOCK_PATH/pid"
  if ! rmdir "$INSTALL_LOCK_PATH" 2>/dev/null || ! mkdir "$INSTALL_LOCK_PATH" 2>/dev/null; then
    echo "Unable to acquire the Better Codex installation lock." >&2
    exit 1
  fi
  printf '%s' "$$" > "$INSTALL_LOCK_PATH/pid"
}

release_install_lock() {
  rm -f "$INSTALL_LOCK_PATH/pid"
  rmdir "$INSTALL_LOCK_PATH" 2>/dev/null || true
}

acquire_install_lock
trap release_install_lock EXIT

ACTIVE_COMMAND_GROUP=""
ACTIVE_WATCHDOG_PID=""

terminate_active_command() {
  if [ -n "$ACTIVE_COMMAND_GROUP" ]; then
    kill -TERM -- "-$ACTIVE_COMMAND_GROUP" 2>/dev/null || true
    sleep 1
    kill -KILL -- "-$ACTIVE_COMMAND_GROUP" 2>/dev/null || true
    wait "$ACTIVE_COMMAND_GROUP" 2>/dev/null || true
    ACTIVE_COMMAND_GROUP=""
  fi
  if [ -n "$ACTIVE_WATCHDOG_PID" ]; then
    kill "$ACTIVE_WATCHDOG_PID" 2>/dev/null || true
    wait "$ACTIVE_WATCHDOG_PID" 2>/dev/null || true
    ACTIVE_WATCHDOG_PID=""
  fi
}

interrupt_install() {
  local status="$1"
  trap - INT TERM
  terminate_active_command
  exit "$status"
}

trap 'interrupt_install 130' INT
trap 'interrupt_install 143' TERM

version_at_least() {
  awk -v current="${1#v}" -v target="${2#v}" '
  function compare(left, right, left_dash, right_dash, left_core, right_core, a, b, left_pre, right_pre, left_parts, right_parts, count, i, av, bv, left_numeric, right_numeric) {
    left_dash = index(left, "-"); right_dash = index(right, "-")
    left_core = left_dash ? substr(left, 1, left_dash - 1) : left
    right_core = right_dash ? substr(right, 1, right_dash - 1) : right
    split(left_core, a, "."); split(right_core, b, ".")
    for (i = 1; i <= 3; i++) {
      av = a[i] + 0; bv = b[i] + 0
      if (av != bv) return av < bv ? -1 : 1
    }
    left_pre = left_dash ? substr(left, left_dash + 1) : ""
    right_pre = right_dash ? substr(right, right_dash + 1) : ""
    if (!length(left_pre) || !length(right_pre)) {
      if (left_pre == right_pre) return 0
      return length(left_pre) ? -1 : 1
    }
    left_count = split(left_pre, left_parts, ".")
    right_count = split(right_pre, right_parts, ".")
    count = left_count > right_count ? left_count : right_count
    for (i = 1; i <= count; i++) {
      if (i > left_count) return -1
      if (i > right_count) return 1
      if (left_parts[i] == right_parts[i]) continue
      left_numeric = left_parts[i] ~ /^[0-9]+$/
      right_numeric = right_parts[i] ~ /^[0-9]+$/
      if (left_numeric && right_numeric) return (left_parts[i] + 0) < (right_parts[i] + 0) ? -1 : 1
      if (left_numeric != right_numeric) return left_numeric ? -1 : 1
      return left_parts[i] < right_parts[i] ? -1 : 1
    }
    return 0
  }
  BEGIN { exit compare(current, target) >= 0 ? 0 : 1 }
  '
}

run_with_timeout() {
  local seconds="$1" child_pid watchdog_pid status marker marker_directory
  trap 'interrupt_install 130' INT
  trap 'interrupt_install 143' TERM
  shift
  marker_directory="$(mktemp -d "${TMPDIR:-/tmp}/better-codex-timeout.XXXXXX")" || return 125
  marker="$marker_directory/timed-out"
  set -m
  "$@" &
  child_pid=$!
  ACTIVE_COMMAND_GROUP="$child_pid"
  set +m
  (
    sleep "$seconds"
    if kill -0 "$child_pid" 2>/dev/null; then
      : > "$marker"
      kill -TERM -- "-$child_pid" 2>/dev/null || true
      sleep 1
      kill -KILL -- "-$child_pid" 2>/dev/null || true
    fi
  ) &
  watchdog_pid=$!
  ACTIVE_WATCHDOG_PID="$watchdog_pid"
  if wait "$child_pid"; then status=0; else status=$?; fi
  ACTIVE_COMMAND_GROUP=""
  kill "$watchdog_pid" 2>/dev/null || true
  wait "$watchdog_pid" 2>/dev/null || true
  ACTIVE_WATCHDOG_PID=""
  if [ -f "$marker" ]; then status=124; fi
  rm -f "$marker"
  rmdir "$marker_directory" 2>/dev/null || true
  return "$status"
}

installed_version() {
  local binary="$1" raw core managed
  raw="$(run_with_timeout 30 "$binary" version --json 2>/dev/null)" || return 1
  core="$(printf '%s' "$raw" | sed -n 's/.*"core":"\([^"]*\)".*/\1/p')"
  managed="$(printf '%s' "$raw" | sed -n 's/.*"managedCore":"\([^"]*\)".*/\1/p')"
  if [ -n "$managed" ] && [ -n "$core" ] && version_at_least "$managed" "$core"; then
    printf '%s' "$managed"
  elif [ -n "$core" ]; then
    printf '%s' "$core"
  else
    return 1
  fi
}

packaged_core_version() {
  local binary="$1" validation_home="$2" raw core
  raw="$(run_with_timeout 30 env BETTER_CODEX_HOME="$validation_home" BETTER_CODEX_DISABLE_DELEGATION=1 "$binary" version --json 2>/dev/null)" || return 1
  core="$(printf '%s' "$raw" | sed -n 's/.*"core":"\([^"]*\)".*/\1/p')"
  [ -n "$core" ] || return 1
  printf '%s' "$core"
}

installation_ready() {
  local binary="$1" output
  if [ "$WITH_SERVICE" != "1" ]; then
    return 0
  fi
  run_with_timeout 30 "$binary" launcher install >/dev/null 2>&1 || return 1
  output="$(run_with_timeout 60 "$binary" doctor 2>/dev/null)" || return 1
  printf '%s' "$output" | awk '/"ok":/ { found=1; ok=($0 ~ /true/); exit } END { if (!found || !ok) exit 1 }'
}

desired_update_channel() {
  local version="$1" preserve_preview="$2"
  if [ "$preserve_preview" = "1" ]; then printf 'preview'; return; fi
  if printf '%s' "$version" | grep -Eq -- '-beta\.[1-9][0-9]*$'; then printf 'preview'; else printf 'stable'; fi
}

set_installed_channel() {
  local binary="$1" channel="$2"
  run_with_timeout 30 "$binary" update channel "$channel" >/dev/null
  grep -Eq '"channel"[[:space:]]*:[[:space:]]*"'"$channel"'"' "$CHANNEL_PATH"
}

EXISTING_BINARY=""
if [ -x "$BIN_DIR/better-codex" ]; then
  EXISTING_BINARY="$BIN_DIR/better-codex"
elif command -v better-codex >/dev/null 2>&1; then
  EXISTING_BINARY="$(command -v better-codex)"
fi

CURRENT_VERSION=""
if [ -n "$EXISTING_BINARY" ]; then
  CURRENT_VERSION="$(installed_version "$EXISTING_BINARY" || true)"
fi

TARGET_VERSION=""
PRESERVE_PREVIEW_LANE=0
if [ -z "${BETTER_CODEX_ARCHIVE:-}" ]; then
  if [ -n "${BETTER_CODEX_VERSION:-}" ]; then
    TAG="$BETTER_CODEX_VERSION"
    if [ "$REQUESTED_CHANNEL" = "preview" ]; then PRESERVE_PREVIEW_LANE=1; fi
  elif [ "$REQUESTED_CHANNEL" = "preview" ] || { [ -n "$EXISTING_BINARY" ] && [ -f "$BETTER_CODEX_DIR/runtime/channel.json" ] && grep -Eq '"channel"[[:space:]]*:[[:space:]]*"preview"' "$BETTER_CODEX_DIR/runtime/channel.json"; }; then
    printf '[Better Codex] Resolving the current Beta release...\n'
    if ! PREVIEW_VERSION="$(resolve_preview_version)"; then
      echo "Unable to resolve the signed Beta release; the existing installation was left unchanged." >&2
      exit 1
    fi
    if [ -z "$PREVIEW_VERSION" ]; then
      echo "Unable to resolve the signed Beta release; the existing installation was left unchanged." >&2
      exit 1
    fi
    TAG="v$PREVIEW_VERSION"
    PRESERVE_PREVIEW_LANE=1
  else
    TAG="$(curl -fsSIL --connect-timeout 15 --max-time 60 --retry 2 --retry-delay 1 -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest?better_codex_cache_bust=$(date +%s)" | sed 's#.*/##; s/[?].*$//')"
  fi
  case "$TAG" in v*) ;; *) TAG="v$TAG" ;; esac
  TARGET_VERSION="${TAG#v}"
fi
DESIRED_CHANNEL="$(desired_update_channel "$TARGET_VERSION" "$PRESERVE_PREVIEW_LANE")"

if [ -n "$CURRENT_VERSION" ] && [ -n "$TARGET_VERSION" ] && version_at_least "$CURRENT_VERSION" "$TARGET_VERSION" && [ -f "$SKILL_DIR/SKILL.md" ] && [ -f "$UPDATE_KEY_PATH" ]; then
  UPDATE_CHECK=""
  if UPDATE_CHECK="$(run_with_timeout 20 "$EXISTING_BINARY" update check 2>/dev/null)" && printf '%s' "$UPDATE_CHECK" | grep -q '"checked":true' && ! printf '%s' "$UPDATE_CHECK" | grep -q '"available":true'; then
    if installation_ready "$EXISTING_BINARY"; then
      set_installed_channel "$EXISTING_BINARY" "$DESIRED_CHANNEL"
      rm -rf "$ISSUE_SKILL_DIR"
      printf '[OK] Better Codex is up to date (v%s)\n' "$CURRENT_VERSION"
      exit 0
    fi
  fi
fi

if [ "$WITH_SERVICE" != "1" ] && [ -n "$CURRENT_VERSION" ] && [ -n "$TARGET_VERSION" ]; then
  printf '[Better Codex] Better Codex v%s is installed; upgrading to v%s...\n' "$CURRENT_VERSION" "$TARGET_VERSION"
  UPDATE_CHECK=""
  if UPDATE_CHECK="$(run_with_timeout 20 "$EXISTING_BINARY" update check 2>/dev/null)" && printf '%s' "$UPDATE_CHECK" | grep -q '"checked":true'; then
    if version_at_least "$CURRENT_VERSION" "$TARGET_VERSION" && ! printf '%s' "$UPDATE_CHECK" | grep -q '"available":true' && installation_ready "$EXISTING_BINARY"; then
      set_installed_channel "$EXISTING_BINARY" "$DESIRED_CHANNEL"
      rm -rf "$ISSUE_SKILL_DIR"
      printf '[OK] Better Codex is up to date (v%s)\n' "$CURRENT_VERSION"
      exit 0
    fi
  else
    printf '[Better Codex] Live update check unavailable; continuing with upgrade...\n' >&2
  fi
  if run_with_timeout 600 "$EXISTING_BINARY" update >/dev/null 2>&1; then
    UPDATED_VERSION="$(installed_version "$EXISTING_BINARY" || true)"
    if [ -n "$UPDATED_VERSION" ] && version_at_least "$UPDATED_VERSION" "$TARGET_VERSION"; then
      UPGRADE_READY=1
      if [ ! -f "$SKILL_DIR/SKILL.md" ] || [ ! -f "$UPDATE_KEY_PATH" ]; then
        UPGRADE_READY=0
      fi
      if [ "$UPGRADE_READY" = "1" ]; then
        set_installed_channel "$EXISTING_BINARY" "$DESIRED_CHANNEL"
        rm -rf "$ISSUE_SKILL_DIR"
        printf '[OK] Better Codex upgraded to v%s\n' "$UPDATED_VERSION"
        exit 0
      fi
    fi
  fi
  printf '[Better Codex] Automatic upgrade unavailable; continuing with full installation...\n'
fi

codex_running() {
  local app bundle_id
  for app in /Applications/Codex.app /Applications/ChatGPT.app; do
    [ -f "$app/Contents/Info.plist" ] || continue
    bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Contents/Info.plist" 2>/dev/null || true)"
    [ -n "$bundle_id" ] && [ "$(/usr/bin/osascript -e "tell application id \"$bundle_id\" to return running" 2>/dev/null || true)" = "true" ] && return 0
  done
  return 1
}

WORK_DIR="$(mktemp -d)"
BACKUP_DIR="$WORK_DIR/previous"
mkdir -p "$BACKUP_DIR"
HAD_BINARY=0
HAD_BUNDLE=0
HAD_SKILL=0
HAD_ISSUE_SKILL=0
HAD_UPDATE_KEY=0
HAD_CHANNEL=0
PREVIOUS_SERVICE_INSTALLED=0
PREVIOUS_SERVICE_RUNNING=0
PREVIOUS_INJECTION_ENABLED=1
LIVE_UPGRADE_COMPLETED=0
[ -e "$BIN_DIR/better-codex" ] && { cp -p "$BIN_DIR/better-codex" "$BACKUP_DIR/better-codex"; HAD_BINARY=1; }
[ -e "$BIN_DIR/better-codex.cjs" ] && { cp -p "$BIN_DIR/better-codex.cjs" "$BACKUP_DIR/better-codex.cjs"; HAD_BUNDLE=1; }
[ -e "$SKILL_DIR" ] && { cp -R "$SKILL_DIR" "$BACKUP_DIR/better-codex-skill"; HAD_SKILL=1; }
[ -e "$ISSUE_SKILL_DIR" ] && { cp -R "$ISSUE_SKILL_DIR" "$BACKUP_DIR/better-codex-issue-skill"; HAD_ISSUE_SKILL=1; }
[ -e "$UPDATE_KEY_PATH" ] && { cp -p "$UPDATE_KEY_PATH" "$BACKUP_DIR/update-public-key.pem"; HAD_UPDATE_KEY=1; }
[ -e "$CHANNEL_PATH" ] && { cp -p "$CHANNEL_PATH" "$BACKUP_DIR/channel.json"; HAD_CHANNEL=1; }
if [ "$HAD_BINARY" = "1" ] && [ "$WITH_SERVICE" = "1" ]; then
  if ! PREVIOUS_SERVICE_STATUS="$(run_with_timeout 30 "$BIN_DIR/better-codex" service status 2>/dev/null)"; then
    echo "Unable to read the existing Better Codex service state; no installation changes were made." >&2
    exit 1
  fi
  if ! printf '%s' "$PREVIOUS_SERVICE_STATUS" | grep -q '"installed":'; then
    echo "Unable to read the existing Better Codex service state; no installation changes were made." >&2
    exit 1
  fi
  printf '%s' "$PREVIOUS_SERVICE_STATUS" | grep -Eq '"installed"[[:space:]]*:[[:space:]]*true' && PREVIOUS_SERVICE_INSTALLED=1
  printf '%s' "$PREVIOUS_SERVICE_STATUS" | grep -Eq '"running"[[:space:]]*:[[:space:]]*true' && PREVIOUS_SERVICE_RUNNING=1
  if [ -f "$BETTER_CODEX_DIR/run/injection.json" ] && ! grep -q '"enabled":true' "$BETTER_CODEX_DIR/run/injection.json"; then PREVIOUS_INJECTION_ENABLED=0; fi
fi
INSTALL_MUTATED=0
finish_install() {
  local status=$?
  set +e
  if [ "$status" -ne 0 ] && [ "$INSTALL_MUTATED" = "1" ]; then
    if [ "$WITH_SERVICE" = "1" ] && [ "$HAD_BINARY" = "0" ] && [ -x "$BIN_DIR/better-codex" ]; then
      run_with_timeout 10 "$BIN_DIR/better-codex" disable >/dev/null 2>&1
      run_with_timeout 10 "$BIN_DIR/better-codex" service uninstall >/dev/null 2>&1
      run_with_timeout 10 "$BIN_DIR/better-codex" launcher uninstall >/dev/null 2>&1
    fi
    if [ "$HAD_BINARY" = "1" ]; then cp -p "$BACKUP_DIR/better-codex" "$BIN_DIR/better-codex"; else rm -f "$BIN_DIR/better-codex"; fi
    if [ "$HAD_BUNDLE" = "1" ]; then cp -p "$BACKUP_DIR/better-codex.cjs" "$BIN_DIR/better-codex.cjs"; else rm -f "$BIN_DIR/better-codex.cjs"; fi
    rm -rf "$SKILL_DIR"
    [ "$HAD_SKILL" = "1" ] && cp -R "$BACKUP_DIR/better-codex-skill" "$SKILL_DIR"
    rm -rf "$ISSUE_SKILL_DIR"
    [ "$HAD_ISSUE_SKILL" = "1" ] && cp -R "$BACKUP_DIR/better-codex-issue-skill" "$ISSUE_SKILL_DIR"
    if [ "$HAD_UPDATE_KEY" = "1" ]; then cp -p "$BACKUP_DIR/update-public-key.pem" "$UPDATE_KEY_PATH"; else rm -f "$UPDATE_KEY_PATH"; fi
    if [ "$HAD_CHANNEL" = "1" ]; then mkdir -p "$(dirname "$CHANNEL_PATH")"; cp -p "$BACKUP_DIR/channel.json" "$CHANNEL_PATH"; else rm -f "$CHANNEL_PATH"; fi
    if [ "$WITH_SERVICE" = "1" ] && [ "$HAD_BINARY" = "1" ] && [ "$LIVE_UPGRADE_COMPLETED" != "1" ]; then
      if [ "$PREVIOUS_SERVICE_INSTALLED" = "1" ]; then
        run_with_timeout 10 "$BIN_DIR/better-codex" service install >/dev/null 2>&1
        if [ "$PREVIOUS_SERVICE_RUNNING" = "1" ]; then run_with_timeout 10 "$BIN_DIR/better-codex" service start >/dev/null 2>&1; else run_with_timeout 10 "$BIN_DIR/better-codex" service stop >/dev/null 2>&1; fi
      else
        run_with_timeout 10 "$BIN_DIR/better-codex" service uninstall >/dev/null 2>&1
      fi
      if [ "$PREVIOUS_INJECTION_ENABLED" = "1" ]; then run_with_timeout 30 "$BIN_DIR/better-codex" enable >/dev/null 2>&1; else run_with_timeout 10 "$BIN_DIR/better-codex" disable >/dev/null 2>&1; fi
    fi
  fi
  release_install_lock
  rm -rf "$WORK_DIR"
  exit "$status"
}
trap finish_install EXIT

if [ -n "${BETTER_CODEX_ARCHIVE:-}" ]; then
  ARCHIVE="$BETTER_CODEX_ARCHIVE"
  CHECKSUMS="${BETTER_CODEX_CHECKSUMS:-$(dirname "$ARCHIVE")/checksums.txt}"
  UPDATE_PUBLIC_KEY="${BETTER_CODEX_UPDATE_PUBLIC_KEY_FILE:-}"
  CHECKSUM_SIGNATURE="${BETTER_CODEX_CHECKSUMS_SIGNATURE:-}"
  [ -f "$ARCHIVE" ] || { echo "Local Better Codex archive not found: $ARCHIVE" >&2; exit 1; }
  [ -f "$CHECKSUMS" ] || { echo "Local Better Codex checksums not found: $CHECKSUMS" >&2; exit 1; }
  printf '[Better Codex] Installing from local package %s...\n' "$(basename "$ARCHIVE")"
else
  VERSION="$TARGET_VERSION"
  NAME="better-codex-cli-$VERSION-darwin-$ARCH.tar.gz"
  BASE="https://github.com/$REPO/releases/download/$TAG"
  ARCHIVE="$WORK_DIR/$NAME"
  CHECKSUMS="$WORK_DIR/checksums.txt"
  UPDATE_PUBLIC_KEY="$WORK_DIR/update-public-key.pem"
  CHECKSUM_SIGNATURE="$WORK_DIR/checksums.sig"
  curl -fsSL --connect-timeout 15 --max-time 300 --retry 2 --retry-delay 1 "$BASE/$NAME" -o "$ARCHIVE"
  curl -fsSL --connect-timeout 15 --max-time 300 --retry 2 --retry-delay 1 "$BASE/checksums.txt" -o "$CHECKSUMS"
  curl -fsSL --connect-timeout 15 --max-time 300 --retry 2 --retry-delay 1 "$BASE/checksums.sig" -o "$CHECKSUM_SIGNATURE"
  curl -fsSL --connect-timeout 15 --max-time 300 --retry 2 --retry-delay 1 "$BASE/update-public-key.pem" -o "$UPDATE_PUBLIC_KEY"
fi

NAME="$(basename "$ARCHIVE")"
EXPECTED="$(awk -v name="$NAME" '$2 == name { print $1 }' "$CHECKSUMS")"
if [ -z "$EXPECTED" ]; then
  echo "No checksum found for $NAME." >&2
  exit 1
fi
ACTUAL="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"
if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "Checksum mismatch for $NAME." >&2
  exit 1
fi
if [ -z "${BETTER_CODEX_ARCHIVE:-}" ]; then
  verify_update_key || { echo "Update public key mismatch." >&2; exit 1; }
  verify_checksums_signature || { echo "Checksums signature verification failed." >&2; exit 1; }
fi
tar -xzf "$ARCHIVE" -C "$WORK_DIR"
if [ -z "$UPDATE_PUBLIC_KEY" ] && [ -f "$WORK_DIR/update-public-key.pem" ]; then
  UPDATE_PUBLIC_KEY="$WORK_DIR/update-public-key.pem"
fi
if ! verify_update_key; then
  echo "Update public key mismatch." >&2
  exit 1
fi
if [ -n "$CHECKSUM_SIGNATURE" ]; then
  if ! verify_checksums_signature; then
    echo "Checksums signature verification failed." >&2
    exit 1
  fi
elif [ -z "${BETTER_CODEX_ARCHIVE:-}" ]; then
  echo "Checksums signature is missing." >&2
  exit 1
fi
if [ ! -x "$WORK_DIR/better-codex" ]; then
  echo "Better Codex launcher is missing from the package." >&2
  exit 1
fi
if [ ! -f "$WORK_DIR/better-codex.cjs" ]; then
  echo "Better Codex bundle is missing from the package." >&2
  exit 1
fi
if [ ! -f "$WORK_DIR/skills/better-codex/SKILL.md" ]; then
  echo "Better Codex skill is missing from the package." >&2
  exit 1
fi
PACKAGED_VERSION="$(packaged_core_version "$WORK_DIR/better-codex" "$WORK_DIR/validation-home" || true)"
if [ -z "$PACKAGED_VERSION" ]; then
  echo "Unable to read the packaged Better Codex version." >&2
  exit 1
fi
if [ -n "$TARGET_VERSION" ] && [ "$PACKAGED_VERSION" != "$TARGET_VERSION" ]; then
  printf '[Better Codex] Package version %s does not match target v%s. Installation cancelled.\n' "$PACKAGED_VERSION" "$TARGET_VERSION" >&2
  exit 1
fi
if [ -z "$TARGET_VERSION" ]; then TARGET_VERSION="$PACKAGED_VERSION"; fi
DESIRED_CHANNEL="$(desired_update_channel "$TARGET_VERSION" "$PRESERVE_PREVIEW_LANE")"
if [ "$WITH_SERVICE" = "1" ] && [ -n "$CURRENT_VERSION" ]; then
  RUNTIME_WAS_LIVE=0
  if RUNTIME_STATUS="$(run_with_timeout 15 "$EXISTING_BINARY" status 2>/dev/null)" && printf '%s' "$RUNTIME_STATUS" | grep -Eq '"ok"[[:space:]]*:[[:space:]]*true'; then RUNTIME_WAS_LIVE=1; fi
  printf '[Better Codex] Applying v%s through the live Runtime update transaction...\n' "$TARGET_VERSION"
  LIVE_UPDATE_LOG="$WORK_DIR/live-update.log"
  if run_with_timeout 660 "$WORK_DIR/better-codex" update install --target-version "$TARGET_VERSION" --channel "$DESIRED_CHANNEL" >"$LIVE_UPDATE_LOG" 2>&1; then
    LIVE_UPGRADE_COMPLETED=1
  elif [ "$PREVIOUS_SERVICE_RUNNING" = "1" ] || [ "$RUNTIME_WAS_LIVE" = "1" ]; then
    if [ "$HAD_CHANNEL" = "1" ]; then mkdir -p "$(dirname "$CHANNEL_PATH")"; cp -p "$BACKUP_DIR/channel.json" "$CHANNEL_PATH"; else rm -f "$CHANNEL_PATH"; fi
    cat "$LIVE_UPDATE_LOG" >&2
    echo "Live Runtime update failed; the running installation was left in place." >&2
    exit 1
  else
    printf '[Better Codex] No live Runtime accepted the update; continuing with installation.\n'
  fi
fi
PRESERVE_CODEX=0
if [ "$WITH_SERVICE" = "1" ] && codex_running; then
  PRESERVE_CODEX=1
  printf '[Better Codex] Codex will remain open while Better Codex is upgraded...\n'
fi
mkdir -p "$BIN_DIR"
INSTALL_MUTATED=1
install -m 755 "$WORK_DIR/better-codex.cjs" "$BIN_DIR/better-codex.cjs"
install -m 755 "$WORK_DIR/better-codex" "$BIN_DIR/better-codex"
printf '[Better Codex] Installing Better Codex skill to %s...\n' "$SKILL_DIR"
mkdir -p "$SKILL_DIR/agents"
install -m 644 "$WORK_DIR/skills/better-codex/SKILL.md" "$SKILL_DIR/SKILL.md"
install -m 644 "$WORK_DIR/skills/better-codex/agents/openai.yaml" "$SKILL_DIR/agents/openai.yaml"
rm -rf "$ISSUE_SKILL_DIR"
if [ -n "$UPDATE_PUBLIC_KEY" ]; then
  mkdir -p "$BETTER_CODEX_DIR"
  install -m 600 "$UPDATE_PUBLIC_KEY" "$UPDATE_KEY_PATH"
fi

run_with_timeout 10 "$BIN_DIR/better-codex" version
if [ "$WITH_SERVICE" = "1" ]; then
  if [ "$LIVE_UPGRADE_COMPLETED" = "1" ]; then
    printf '[Better Codex] Refreshing launcher and injection after the live Runtime handoff...\n'
    run_with_timeout 15 "$BIN_DIR/better-codex" launcher install >/dev/null
    run_with_timeout 60 "$BIN_DIR/better-codex" inject --launch >/dev/null
  else
    printf '[Better Codex] Registering runtime and refreshing Better Codex...\n'
    SETUP_LOG="$WORK_DIR/setup.log"
    if [ "$PRESERVE_CODEX" = "1" ]; then
      SETUP_ARGUMENTS="--yes --preserve-codex"
    else
      SETUP_ARGUMENTS="--yes"
    fi
    if ! run_with_timeout 120 "$BIN_DIR/better-codex" setup $SETUP_ARGUMENTS >"$SETUP_LOG" 2>&1; then
      cat "$SETUP_LOG" >&2
      exit 1
    fi
  fi
  printf '[Better Codex] Running installation diagnostics...\n'
  DOCTOR_LOG="$WORK_DIR/doctor.log"
  if [ "$PRESERVE_CODEX" = "1" ] || [ "$LIVE_UPGRADE_COMPLETED" = "1" ]; then
    DOCTOR_ARGUMENTS="--allow-pending-injection"
  else
    DOCTOR_ARGUMENTS=""
  fi
  if ! run_with_timeout 20 "$BIN_DIR/better-codex" doctor $DOCTOR_ARGUMENTS >"$DOCTOR_LOG" 2>&1; then
    cat "$DOCTOR_LOG" >&2
    exit 1
  fi
  if ! awk '/"ok":/ { found=1; ok=($0 ~ /true/); exit } END { if (!found || !ok) exit 1 }' "$DOCTOR_LOG"; then
    cat "$DOCTOR_LOG" >&2
    exit 1
  fi
  if [ "$PRESERVE_CODEX" = "1" ] || [ "$LIVE_UPGRADE_COMPLETED" = "1" ]; then
    printf '[Better Codex] Codex remained open. Core, Runtime, Skill, and MCP are upgraded. Reopen Codex from the Better Codex launcher only if the page did not refresh.\n'
  fi
fi
READY_VERSION="$(installed_version "$BIN_DIR/better-codex" || true)"
if [ -n "$TARGET_VERSION" ] && [ "$READY_VERSION" != "$TARGET_VERSION" ]; then
  printf '[Better Codex] Installed version %s does not match target v%s. Installation failed.\n' "${READY_VERSION:-unknown}" "$TARGET_VERSION" >&2
  exit 1
fi
DESIRED_CHANNEL="$(desired_update_channel "$TARGET_VERSION" "$PRESERVE_PREVIEW_LANE")"
set_installed_channel "$BIN_DIR/better-codex" "$DESIRED_CHANNEL"
if [ "${BETTER_CODEX_SKIP_PATH_UPDATE:-0}" != "1" ] && ! printf '%s' ":$PATH:" | grep -q ":$BIN_DIR:"; then
  for RC in "$HOME/.zshrc" "$HOME/.bashrc"; do
    if [ -f "$RC" ] && ! grep -qF "$BIN_DIR" "$RC"; then
      printf '\nexport PATH="%s:$PATH"\n' "$BIN_DIR" >> "$RC"
    fi
  done
fi
if [ -n "$READY_VERSION" ]; then
  printf '[OK] Better Codex v%s is ready\n' "$READY_VERSION"
else
  printf '[OK] Better Codex is ready\n'
fi
INSTALL_MUTATED=0
