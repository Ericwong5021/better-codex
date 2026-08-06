#!/usr/bin/env bash
set -euo pipefail

REPO="${BETTER_CODEX_REPO:-Ericwong5021/better-codex}"
BIN_DIR="${BETTER_CODEX_BIN_DIR:-$HOME/.local/bin}"
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

CODEX_APP=""
for CANDIDATE in Codex ChatGPT; do
  if /usr/bin/pgrep -x "$CANDIDATE" >/dev/null 2>&1; then
    CODEX_APP="$CANDIDATE"
    break
  fi
done

if [ -n "$CODEX_APP" ]; then
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
  /usr/bin/osascript -e "tell application \"$CODEX_APP\" to quit" >/dev/null 2>&1 || true
  for ATTEMPT in $(seq 1 40); do
    if ! /usr/bin/pgrep -x "$CODEX_APP" >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done
  if /usr/bin/pgrep -x "$CODEX_APP" >/dev/null 2>&1; then
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
  TAG="${BETTER_CODEX_VERSION:-$(curl -fsSIL -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest" | sed 's#.*/##')}"
  VERSION="${TAG#v}"
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
  "$BIN_DIR/better-codex" setup --yes
  "$BIN_DIR/better-codex" doctor
fi
printf 'Installed Better Codex to %s\n' "$BIN_DIR/better-codex"
