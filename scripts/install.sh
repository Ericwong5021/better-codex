#!/usr/bin/env bash
set -euo pipefail

REPO="${BETTER_CODEX_REPO:-Ericwong5021/better-codex}"
BIN_DIR="${BETTER_CODEX_BIN_DIR:-$HOME/.local/bin}"
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
SKILL_DIR="$CODEX_DIR/skills/better-codex"
ISSUE_SKILL_DIR="$CODEX_DIR/skills/better-codex-issue"
BETTER_CODEX_DIR="${BETTER_CODEX_HOME:-$HOME/.better-codex}"
UPDATE_KEY_PATH="$BETTER_CODEX_DIR/update-public-key.pem"
INSTALL_LOCK_PATH="$BETTER_CODEX_DIR/install.lock"
UPDATE_KEY_SHA256="1007607762db32004da21780e81875bef8453355a2944524a96e5341e1e3963e"
WITH_SERVICE=1

if [ "${1:-}" = "--no-service" ]; then
  WITH_SERVICE=0
elif [ -n "${1:-}" ]; then
  echo "Usage: install.sh [--no-service]" >&2
  exit 1
fi

if [ "$(uname -s)" != "Darwin" ]; then
  echo "Better Codex currently supports macOS only." >&2
  exit 1
fi

case "$(uname -m)" in
  arm64) ARCH="arm64" ;;
  x86_64) ARCH="amd64" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

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

version_at_least() {
  awk -v current="${1#v}" -v target="${2#v}" 'BEGIN {
    split(current, a, "."); split(target, b, ".")
    for (i = 1; i <= 4; i++) {
      av = a[i] + 0; bv = b[i] + 0
      if (av > bv) exit 0
      if (av < bv) exit 1
    }
    exit 0
  }'
}

installed_version() {
  local binary="$1" raw core managed
  raw="$("$binary" version --json 2>/dev/null)" || return 1
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

installation_ready() {
  local binary="$1" output
  if [ "$WITH_SERVICE" != "1" ]; then
    return 0
  fi
  "$binary" launcher install >/dev/null 2>&1 || return 1
  output="$("$binary" doctor 2>/dev/null)" || return 1
  printf '%s' "$output" | awk '/"ok":/ { found=1; ok=($0 ~ /true/); exit } END { if (!found || !ok) exit 1 }'
}

TARGET_VERSION=""
if [ -z "${BETTER_CODEX_ARCHIVE:-}" ]; then
  TAG="${BETTER_CODEX_VERSION:-$(curl -fsSIL -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest?better_codex_cache_bust=$(date +%s)" | sed 's#.*/##; s/[?].*$//')}"
  TARGET_VERSION="${TAG#v}"
fi

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

if [ -n "$CURRENT_VERSION" ] && [ -n "$TARGET_VERSION" ] && version_at_least "$CURRENT_VERSION" "$TARGET_VERSION" && [ -f "$SKILL_DIR/SKILL.md" ] && [ -f "$ISSUE_SKILL_DIR/SKILL.md" ] && [ -f "$UPDATE_KEY_PATH" ]; then
  UPDATE_CHECK=""
  if UPDATE_CHECK="$($EXISTING_BINARY update check 2>/dev/null)" && printf '%s' "$UPDATE_CHECK" | grep -q '"checked":true' && ! printf '%s' "$UPDATE_CHECK" | grep -q '"available":true'; then
    if installation_ready "$EXISTING_BINARY"; then
      printf '[OK] Better Codex is up to date (v%s)\n' "$CURRENT_VERSION"
      exit 0
    fi
  fi
fi

if [ -n "$CURRENT_VERSION" ] && [ -n "$TARGET_VERSION" ]; then
  printf '[Better Codex] Better Codex v%s is installed; upgrading to v%s...\n' "$CURRENT_VERSION" "$TARGET_VERSION"
  UPDATE_CHECK=""
  if UPDATE_CHECK="$($EXISTING_BINARY update check 2>/dev/null)" && printf '%s' "$UPDATE_CHECK" | grep -q '"checked":true'; then
    if version_at_least "$CURRENT_VERSION" "$TARGET_VERSION" && ! printf '%s' "$UPDATE_CHECK" | grep -q '"available":true' && installation_ready "$EXISTING_BINARY"; then
      printf '[OK] Better Codex is up to date (v%s)\n' "$CURRENT_VERSION"
      exit 0
    fi
  else
    printf '[Better Codex] Live update check unavailable; continuing with upgrade...\n' >&2
  fi
  if "$EXISTING_BINARY" update >/dev/null 2>&1; then
    UPDATED_VERSION="$(installed_version "$EXISTING_BINARY" || true)"
    if [ -n "$UPDATED_VERSION" ] && version_at_least "$UPDATED_VERSION" "$TARGET_VERSION"; then
      UPGRADE_READY=1
      if [ ! -f "$SKILL_DIR/SKILL.md" ] || [ ! -f "$ISSUE_SKILL_DIR/SKILL.md" ] || [ ! -f "$UPDATE_KEY_PATH" ]; then
        UPGRADE_READY=0
      elif [ "$WITH_SERVICE" = "1" ]; then
        "$EXISTING_BINARY" service restart >/dev/null 2>&1 || UPGRADE_READY=0
        if [ "$UPGRADE_READY" = "1" ]; then
          sleep 0.8
          "$EXISTING_BINARY" inject --launch >/dev/null 2>&1 || UPGRADE_READY=0
          "$EXISTING_BINARY" launcher install >/dev/null 2>&1 || UPGRADE_READY=0
          installation_ready "$EXISTING_BINARY" || UPGRADE_READY=0
        fi
      fi
      if [ "$UPGRADE_READY" = "1" ]; then
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

stop_better_codex_helpers() {
  if [ -n "${EXISTING_BINARY:-}" ]; then
    "$EXISTING_BINARY" disable >/dev/null 2>&1 || true
    "$EXISTING_BINARY" service stop >/dev/null 2>&1 || true
  fi
}

quit_codex() {
  local app bundle_id pid
  stop_better_codex_helpers
  for app in /Applications/Codex.app /Applications/ChatGPT.app; do
    [ -f "$app/Contents/Info.plist" ] || continue
    bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Contents/Info.plist" 2>/dev/null || true)"
    [ -n "$bundle_id" ] && (/usr/bin/osascript -e "tell application id \"$bundle_id\" to quit" >/dev/null 2>&1 || true) &
  done
  for _ in $(seq 1 20); do
    if ! codex_running; then
      return 0
    fi
    sleep 0.25
  done
  for app in /Applications/Codex.app /Applications/ChatGPT.app; do
    while IFS= read -r pid; do
      [ -n "$pid" ] && /bin/kill -9 "$pid" >/dev/null 2>&1 || true
    done < <(/usr/bin/pgrep -f "^$app/Contents/MacOS/" 2>/dev/null || true)
  done
  sleep 0.5
  ! codex_running
}

WORK_DIR="$(mktemp -d)"
BACKUP_DIR="$WORK_DIR/previous"
mkdir -p "$BACKUP_DIR"
HAD_BINARY=0
HAD_SKILL=0
HAD_ISSUE_SKILL=0
HAD_UPDATE_KEY=0
PREVIOUS_SERVICE_INSTALLED=0
PREVIOUS_SERVICE_RUNNING=0
PREVIOUS_INJECTION_ENABLED=1
[ -e "$BIN_DIR/better-codex" ] && { cp -p "$BIN_DIR/better-codex" "$BACKUP_DIR/better-codex"; HAD_BINARY=1; }
[ -e "$SKILL_DIR" ] && { cp -R "$SKILL_DIR" "$BACKUP_DIR/better-codex-skill"; HAD_SKILL=1; }
[ -e "$ISSUE_SKILL_DIR" ] && { cp -R "$ISSUE_SKILL_DIR" "$BACKUP_DIR/better-codex-issue-skill"; HAD_ISSUE_SKILL=1; }
[ -e "$UPDATE_KEY_PATH" ] && { cp -p "$UPDATE_KEY_PATH" "$BACKUP_DIR/update-public-key.pem"; HAD_UPDATE_KEY=1; }
if [ "$HAD_BINARY" = "1" ]; then
  PREVIOUS_SERVICE_STATUS="$("$BIN_DIR/better-codex" service status 2>/dev/null || true)"
  printf '%s' "$PREVIOUS_SERVICE_STATUS" | grep -q '"installed":true' && PREVIOUS_SERVICE_INSTALLED=1
  printf '%s' "$PREVIOUS_SERVICE_STATUS" | grep -q '"running":true' && PREVIOUS_SERVICE_RUNNING=1
  if [ -f "$BETTER_CODEX_DIR/run/injection.json" ] && ! grep -q '"enabled":true' "$BETTER_CODEX_DIR/run/injection.json"; then PREVIOUS_INJECTION_ENABLED=0; fi
fi
INSTALL_MUTATED=0
finish_install() {
  local status=$?
  set +e
  if [ "$status" -ne 0 ] && [ "$INSTALL_MUTATED" = "1" ]; then
    if [ "$WITH_SERVICE" = "1" ] && [ "$HAD_BINARY" = "0" ] && [ -x "$BIN_DIR/better-codex" ]; then
      "$BIN_DIR/better-codex" disable >/dev/null 2>&1
      "$BIN_DIR/better-codex" service uninstall >/dev/null 2>&1
      "$BIN_DIR/better-codex" launcher uninstall >/dev/null 2>&1
    fi
    if [ "$HAD_BINARY" = "1" ]; then cp -p "$BACKUP_DIR/better-codex" "$BIN_DIR/better-codex"; else rm -f "$BIN_DIR/better-codex"; fi
    rm -rf "$SKILL_DIR"
    [ "$HAD_SKILL" = "1" ] && cp -R "$BACKUP_DIR/better-codex-skill" "$SKILL_DIR"
    rm -rf "$ISSUE_SKILL_DIR"
    [ "$HAD_ISSUE_SKILL" = "1" ] && cp -R "$BACKUP_DIR/better-codex-issue-skill" "$ISSUE_SKILL_DIR"
    if [ "$HAD_UPDATE_KEY" = "1" ]; then cp -p "$BACKUP_DIR/update-public-key.pem" "$UPDATE_KEY_PATH"; else rm -f "$UPDATE_KEY_PATH"; fi
    if [ "$WITH_SERVICE" = "1" ] && [ "$HAD_BINARY" = "1" ]; then
      if [ "$PREVIOUS_SERVICE_INSTALLED" = "1" ]; then
        "$BIN_DIR/better-codex" service install >/dev/null 2>&1
        if [ "$PREVIOUS_SERVICE_RUNNING" = "1" ]; then "$BIN_DIR/better-codex" service start >/dev/null 2>&1; else "$BIN_DIR/better-codex" service stop >/dev/null 2>&1; fi
      else
        "$BIN_DIR/better-codex" service uninstall >/dev/null 2>&1
      fi
      if [ "$PREVIOUS_INJECTION_ENABLED" = "1" ]; then "$BIN_DIR/better-codex" enable >/dev/null 2>&1; else "$BIN_DIR/better-codex" disable >/dev/null 2>&1; fi
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
else
  VERSION="$TARGET_VERSION"
  NAME="better-codex-cli-$VERSION-darwin-$ARCH.tar.gz"
  BASE="https://github.com/$REPO/releases/download/$TAG"
  ARCHIVE="$WORK_DIR/$NAME"
  CHECKSUMS="$WORK_DIR/checksums.txt"
  UPDATE_PUBLIC_KEY="$WORK_DIR/update-public-key.pem"
  curl -fsSL "$BASE/$NAME" -o "$ARCHIVE"
  curl -fsSL "$BASE/checksums.txt" -o "$CHECKSUMS"
  curl -fsSL "$BASE/update-public-key.pem" -o "$UPDATE_PUBLIC_KEY"
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
tar -xzf "$ARCHIVE" -C "$WORK_DIR"
if [ -z "$UPDATE_PUBLIC_KEY" ] && [ -f "$WORK_DIR/update-public-key.pem" ]; then
  UPDATE_PUBLIC_KEY="$WORK_DIR/update-public-key.pem"
fi
if [ -z "$UPDATE_PUBLIC_KEY" ] || [ "$(shasum -a 256 "$UPDATE_PUBLIC_KEY" | awk '{print $1}')" != "$UPDATE_KEY_SHA256" ]; then
  echo "Update public key mismatch." >&2
  exit 1
fi
if [ ! -x "$WORK_DIR/better-codex" ]; then
  echo "Better Codex executable is missing from the package." >&2
  exit 1
fi
if [ ! -f "$WORK_DIR/skills/better-codex/SKILL.md" ]; then
  echo "Better Codex skill is missing from the package." >&2
  exit 1
fi
if [ ! -f "$WORK_DIR/skills/better-codex-issue/SKILL.md" ]; then
  echo "Better Codex issue skill is missing from the package." >&2
  exit 1
fi
if [ "$WITH_SERVICE" = "1" ] && codex_running; then
  if [ ! -r /dev/tty ]; then
    echo "Codex is running. Quit it completely and run the installer again." >&2
    exit 1
  fi
  printf 'Codex is currently running. Quit Codex and continue installation? [Y/n] ' >/dev/tty
  read -r CHOICE </dev/tty
  if [ -n "$CHOICE" ] && [ "$CHOICE" != "y" ] && [ "$CHOICE" != "Y" ]; then
    echo "Installation cancelled."
    exit 0
  fi
  INSTALL_MUTATED=1
  printf '[Better Codex] Stopping Codex...\n'
  if ! quit_codex; then
    echo "Codex did not quit. Quit it manually and run the installer again." >&2
    exit 1
  fi
fi
mkdir -p "$BIN_DIR"
INSTALL_MUTATED=1
install -m 755 "$WORK_DIR/better-codex" "$BIN_DIR/better-codex"
printf '[Better Codex] Installing Better Codex skill to %s...\n' "$SKILL_DIR"
mkdir -p "$SKILL_DIR/agents"
install -m 644 "$WORK_DIR/skills/better-codex/SKILL.md" "$SKILL_DIR/SKILL.md"
install -m 644 "$WORK_DIR/skills/better-codex/agents/openai.yaml" "$SKILL_DIR/agents/openai.yaml"
printf '[Better Codex] Installing Better Codex issue skill to %s...\n' "$ISSUE_SKILL_DIR"
mkdir -p "$ISSUE_SKILL_DIR/agents"
install -m 644 "$WORK_DIR/skills/better-codex-issue/SKILL.md" "$ISSUE_SKILL_DIR/SKILL.md"
install -m 644 "$WORK_DIR/skills/better-codex-issue/agents/openai.yaml" "$ISSUE_SKILL_DIR/agents/openai.yaml"
if [ -n "$UPDATE_PUBLIC_KEY" ]; then
  mkdir -p "$BETTER_CODEX_DIR"
  install -m 600 "$UPDATE_PUBLIC_KEY" "$UPDATE_KEY_PATH"
fi

"$BIN_DIR/better-codex" version
if [ "$WITH_SERVICE" = "1" ]; then
  printf '[Better Codex] Registering runtime and injecting Better Codex...\n'
  SETUP_LOG="$WORK_DIR/setup.log"
  if ! "$BIN_DIR/better-codex" setup --yes >"$SETUP_LOG" 2>&1; then
    cat "$SETUP_LOG" >&2
    exit 1
  fi
  printf '[Better Codex] Running installation diagnostics...\n'
  DOCTOR_LOG="$WORK_DIR/doctor.log"
  if ! "$BIN_DIR/better-codex" doctor >"$DOCTOR_LOG" 2>&1; then
    cat "$DOCTOR_LOG" >&2
    exit 1
  fi
  if ! awk '/"ok":/ { found=1; ok=($0 ~ /true/); exit } END { if (!found || !ok) exit 1 }' "$DOCTOR_LOG"; then
    cat "$DOCTOR_LOG" >&2
    exit 1
  fi
fi
if ! printf '%s' ":$PATH:" | grep -q ":$BIN_DIR:"; then
  for RC in "$HOME/.zshrc" "$HOME/.bashrc"; do
    if [ -f "$RC" ] && ! grep -qF "$BIN_DIR" "$RC"; then
      printf '\nexport PATH="%s:$PATH"\n' "$BIN_DIR" >> "$RC"
    fi
  done
fi
READY_VERSION="$(installed_version "$BIN_DIR/better-codex" || true)"
if [ -n "$READY_VERSION" ]; then
  printf '[OK] Better Codex v%s is ready\n' "$READY_VERSION"
else
  printf '[OK] Better Codex is ready\n'
fi
INSTALL_MUTATED=0
