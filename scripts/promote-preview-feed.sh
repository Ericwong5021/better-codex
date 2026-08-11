#!/usr/bin/env bash
set -euo pipefail

CANDIDATE="${1:?candidate manifest is required}"
PUBLIC_KEY="${2:-assets/update-public-key.pem}"
WORK="$(mktemp -d "${RUNNER_TEMP:-/tmp}/better-codex-preview-feed.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
REUSED_CURRENT=0

node scripts/preview-feed.mjs verify "$CANDIDATE" "$PUBLIC_KEY"
cp scripts/install-beta.ps1 "$WORK/install.ps1"

if ! gh release view preview >/dev/null 2>&1; then
  gh release create preview "$CANDIDATE#update-manifest.json" "$WORK/install.ps1" --prerelease --latest=false --target "${GITHUB_SHA}" --title "Better Codex Preview" --notes "The signed update feed and installer for Preview subscribers."
else
  mkdir -p "$WORK/current"
  asset_count="$(gh release view preview --json assets --jq '[.assets[] | select(.name == "update-manifest.json")] | length')"
  if [ "$asset_count" = "0" ]; then
    gh release upload preview "$CANDIDATE#update-manifest.json"
  else
    gh release download preview --pattern update-manifest.json --dir "$WORK/current"
    uploaded=0
    if node scripts/preview-feed.mjs same-version "$WORK/current/update-manifest.json" "$CANDIDATE" "$PUBLIC_KEY" >/dev/null 2>&1; then
      cp "$WORK/current/update-manifest.json" "$CANDIDATE"
      REUSED_CURRENT=1
      uploaded=1
    else
      node scripts/preview-feed.mjs promote "$WORK/current/update-manifest.json" "$CANDIDATE" "$PUBLIC_KEY"
      for attempt in 1 2 3; do
        if gh release upload preview "$CANDIDATE#update-manifest.json" --clobber; then
          uploaded=1
          break
        fi
        sleep "$attempt"
      done
    fi
    if [ "$uploaded" != "1" ]; then
      mkdir -p "$WORK/uncertain"
      if gh release download preview --pattern update-manifest.json --dir "$WORK/uncertain" \
        && cmp "$CANDIDATE" "$WORK/uncertain/update-manifest.json" \
        && node scripts/preview-feed.mjs verify "$WORK/uncertain/update-manifest.json" "$PUBLIC_KEY"; then
        uploaded=1
      else
        exit 1
      fi
    fi
  fi
fi

installer_uploaded=0
installer_asset_count="$(gh release view preview --json assets --jq '[.assets[] | select(.name == "install.ps1")] | length')"
if [ "$installer_asset_count" = "0" ]; then
  gh release upload preview "$WORK/install.ps1"
  installer_uploaded=1
elif [ "$REUSED_CURRENT" = "1" ]; then
  mkdir -p "$WORK/current-installer"
  gh release download preview --pattern install.ps1 --dir "$WORK/current-installer"
  cmp "$WORK/install.ps1" "$WORK/current-installer/install.ps1"
  installer_uploaded=1
else
  for attempt in 1 2 3; do
    if gh release upload preview "$WORK/install.ps1" --clobber; then
      installer_uploaded=1
      break
    fi
    sleep "$attempt"
  done
fi
if [ "$installer_uploaded" != "1" ]; then
  mkdir -p "$WORK/uncertain-installer"
  if gh release download preview --pattern install.ps1 --dir "$WORK/uncertain-installer" \
    && cmp "$WORK/install.ps1" "$WORK/uncertain-installer/install.ps1"; then
    installer_uploaded=1
  else
    exit 1
  fi
fi

mkdir -p "$WORK/published"
gh release download preview --pattern update-manifest.json --dir "$WORK/published"
cmp "$CANDIDATE" "$WORK/published/update-manifest.json"
node scripts/preview-feed.mjs verify "$WORK/published/update-manifest.json" "$PUBLIC_KEY"
mkdir -p "$WORK/published-installer"
gh release download preview --pattern install.ps1 --dir "$WORK/published-installer"
cmp scripts/install-beta.ps1 "$WORK/published-installer/install.ps1"
legacy_installer_asset_count="$(gh release view preview --json assets --jq '[.assets[] | select(.name == "install-beta.ps1")] | length')"
if [ "$legacy_installer_asset_count" != "0" ]; then
  gh release delete-asset preview install-beta.ps1 --yes
fi
