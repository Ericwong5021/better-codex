#!/usr/bin/env bash
set -euo pipefail

REPO="${TILO_REPO:-Ericwong5021/tilo}"
BIN_DIR="${TILO_BIN_DIR:-$HOME/.local/bin}"
WITH_SERVICE=1

if [ "${1:-}" = "--no-service" ]; then
  WITH_SERVICE=0
elif [ -n "${1:-}" ]; then
  echo "Usage: install.sh [--no-service]" >&2
  exit 1
fi

if [ "$(uname -s)" != "Darwin" ]; then
  echo "Tilo currently supports macOS only." >&2
  exit 1
fi

case "$(uname -m)" in
  arm64) ARCH="arm64" ;;
  x86_64) ARCH="amd64" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

if [ -n "${TILO_ARCHIVE:-}" ]; then
  ARCHIVE="$TILO_ARCHIVE"
  CHECKSUMS="${TILO_CHECKSUMS:-$(dirname "$ARCHIVE")/checksums.txt}"
else
  TAG="${TILO_VERSION:-$(curl -fsSIL -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest" | sed 's#.*/##')}"
  VERSION="${TAG#v}"
  NAME="tilo-cli-$VERSION-darwin-$ARCH.tar.gz"
  BASE="https://github.com/$REPO/releases/download/$TAG"
  ARCHIVE="$WORK_DIR/$NAME"
  CHECKSUMS="$WORK_DIR/checksums.txt"
  curl -fsSL "$BASE/$NAME" -o "$ARCHIVE"
  curl -fsSL "$BASE/checksums.txt" -o "$CHECKSUMS"
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
install -m 755 "$WORK_DIR/tilo" "$BIN_DIR/tilo"

if ! printf '%s' ":$PATH:" | grep -q ":$BIN_DIR:"; then
  for RC in "$HOME/.zshrc" "$HOME/.bashrc"; do
    if [ -f "$RC" ] && ! grep -qF "$BIN_DIR" "$RC"; then
      printf '\nexport PATH="%s:$PATH"\n' "$BIN_DIR" >> "$RC"
    fi
  done
fi

"$BIN_DIR/tilo" version
if [ "$WITH_SERVICE" = "1" ]; then
  "$BIN_DIR/tilo" service install
fi
printf 'Installed Tilo to %s\n' "$BIN_DIR/tilo"
