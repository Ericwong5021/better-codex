#!/usr/bin/env bash
set -euo pipefail

CANDIDATE="${1:?candidate manifest is required}"
PUBLIC_KEY="${2:-assets/update-public-key.pem}"
WORK="$(mktemp -d "${RUNNER_TEMP:-/tmp}/better-codex-preview-feed.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

node scripts/preview-feed.mjs verify "$CANDIDATE" "$PUBLIC_KEY"

if ! gh release view preview >/dev/null 2>&1; then
  gh release create preview "$CANDIDATE#update-manifest.json" --prerelease --latest=false --target "${GITHUB_SHA}" --title "Better Codex Preview" --notes "The signed update feed for Preview subscribers."
else
  mkdir -p "$WORK/current"
  asset_count="$(gh release view preview --json assets --jq '[.assets[] | select(.name == "update-manifest.json")] | length')"
  if [ "$asset_count" = "0" ]; then
    gh release upload preview "$CANDIDATE#update-manifest.json"
  else
    gh release download preview --pattern update-manifest.json --dir "$WORK/current"
    node scripts/preview-feed.mjs promote "$WORK/current/update-manifest.json" "$CANDIDATE" "$PUBLIC_KEY"
    uploaded=0
    for attempt in 1 2 3; do
      if gh release upload preview "$CANDIDATE#update-manifest.json" --clobber; then
        uploaded=1
        break
      fi
      sleep "$attempt"
    done
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

mkdir -p "$WORK/published"
gh release download preview --pattern update-manifest.json --dir "$WORK/published"
cmp "$CANDIDATE" "$WORK/published/update-manifest.json"
node scripts/preview-feed.mjs verify "$WORK/published/update-manifest.json" "$PUBLIC_KEY"
