#!/usr/bin/env bash
set -euo pipefail

REPO="${BETTER_CODEX_REPO:-Ericwong5021/better-codex}"
BIN_DIR="${BETTER_CODEX_BIN_DIR:-$HOME/.local/bin}"
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
SKILL_DIR="$CODEX_DIR/skills/better-codex"
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

TARGET_VERSION=""
if [ -z "${BETTER_CODEX_ARCHIVE:-}" ]; then
  TAG="${BETTER_CODEX_VERSION:-$(curl -fsSIL -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest" | sed 's#.*/##')}"
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

if [ -n "$CURRENT_VERSION" ] && [ -n "$TARGET_VERSION" ] && version_at_least "$CURRENT_VERSION" "$TARGET_VERSION" && [ -f "$SKILL_DIR/SKILL.md" ]; then
  if [ "$WITH_SERVICE" = "1" ]; then
    "$EXISTING_BINARY" launcher install >/dev/null 2>&1 || true
  fi
  printf '[OK] Better Codex is up to date (v%s)\n' "$CURRENT_VERSION"
  exit 0
fi

if [ -n "$CURRENT_VERSION" ] && [ -n "$TARGET_VERSION" ]; then
  printf '[Better Codex] Better Codex v%s is installed; upgrading to v%s...\n' "$CURRENT_VERSION" "$TARGET_VERSION"
  if "$EXISTING_BINARY" update >/dev/null 2>&1; then
    UPDATED_VERSION="$(installed_version "$EXISTING_BINARY" || true)"
    if [ -n "$UPDATED_VERSION" ] && version_at_least "$UPDATED_VERSION" "$TARGET_VERSION"; then
      UPGRADE_READY=1
      if [ "$WITH_SERVICE" = "1" ]; then
        "$EXISTING_BINARY" service restart >/dev/null 2>&1 || UPGRADE_READY=0
        if [ "$UPGRADE_READY" = "1" ]; then
          sleep 0.8
          "$EXISTING_BINARY" inject --launch >/dev/null 2>&1 || UPGRADE_READY=0
          "$EXISTING_BINARY" launcher install >/dev/null 2>&1 || UPGRADE_READY=0
          "$EXISTING_BINARY" doctor >/dev/null 2>&1 || UPGRADE_READY=0
        fi
      fi
      if [ "$UPGRADE_READY" = "1" ] && [ -f "$SKILL_DIR/SKILL.md" ]; then
        printf '[OK] Better Codex upgraded to v%s\n' "$UPDATED_VERSION"
        exit 0
      fi
    fi
  fi
  printf '[Better Codex] Automatic upgrade unavailable; continuing with full installation...\n'
fi

codex_running() {
  /usr/bin/pgrep -x ChatGPT >/dev/null 2>&1 || /usr/bin/pgrep -x Codex >/dev/null 2>&1
}

quit_codex() {
  # Stop Better Codex first so watch-inject does not relaunch Codex mid-quit.
  if [ -n "${EXISTING_BINARY:-}" ]; then
    "$EXISTING_BINARY" disable >/dev/null 2>&1 || true
    "$EXISTING_BINARY" service stop >/dev/null 2>&1 || true
  fi
  for APP in ChatGPT Codex; do
    /usr/bin/osascript -e "tell application \"$APP\" to quit" >/dev/null 2>&1 || true
  done
  for _ in $(seq 1 40); do
    if ! codex_running; then
      return 0
    fi
    sleep 0.25
  done
  # Soft quit often fails without Automation permission or when Electron ignores it.
  /usr/bin/killall ChatGPT >/dev/null 2>&1 || true
  /usr/bin/killall Codex >/dev/null 2>&1 || true
  sleep 0.5
  if codex_running; then
    /usr/bin/killall -9 ChatGPT >/dev/null 2>&1 || true
    /usr/bin/killall -9 Codex >/dev/null 2>&1 || true
    sleep 0.5
  fi
  if codex_running; then
    return 1
  fi
  return 0
}

if codex_running; then
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
  printf '[Better Codex] Stopping Codex...\n'
  if ! quit_codex; then
    echo "Codex did not quit. Quit it manually and run the installer again." >&2
    exit 1
  fi
fi

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

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
mkdir -p "$BIN_DIR"
install -m 755 "$WORK_DIR/better-codex" "$BIN_DIR/better-codex"
if [ ! -f "$WORK_DIR/skills/better-codex/SKILL.md" ]; then
  echo "Better Codex skill is missing from the package." >&2
  exit 1
fi
printf '[Better Codex] Installing Better Codex skill to %s...\n' "$SKILL_DIR"
mkdir -p "$SKILL_DIR/agents"
install -m 644 "$WORK_DIR/skills/better-codex/SKILL.md" "$SKILL_DIR/SKILL.md"
install -m 644 "$WORK_DIR/skills/better-codex/agents/openai.yaml" "$SKILL_DIR/agents/openai.yaml"
if [ -n "$UPDATE_PUBLIC_KEY" ]; then
  mkdir -p "$HOME/.better-codex"
  install -m 600 "$UPDATE_PUBLIC_KEY" "$HOME/.better-codex/update-public-key.pem"
fi

if ! printf '%s' ":$PATH:" | grep -q ":$BIN_DIR:"; then
  for RC in "$HOME/.zshrc" "$HOME/.bashrc"; do
    if [ -f "$RC" ] && ! grep -qF "$BIN_DIR" "$RC"; then
      printf '\nexport PATH="%s:$PATH"\n' "$BIN_DIR" >> "$RC"
    fi
  done
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
READY_VERSION="$(installed_version "$BIN_DIR/better-codex" || true)"
if [ -n "$READY_VERSION" ]; then
  printf '[OK] Better Codex v%s is ready\n' "$READY_VERSION"
else
  printf '[OK] Better Codex is ready\n'
fi
