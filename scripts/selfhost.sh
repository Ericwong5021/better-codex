#!/usr/bin/env bash
set -euo pipefail

repository="https://github.com/Ericwong5021/better-codex.git"
release_api="https://api.github.com/repos/Ericwong5021/better-codex/releases/latest"
release_download="https://github.com/Ericwong5021/better-codex/releases/download"
update_key_sha256="1007607762db32004da21780e81875bef8453355a2944524a96e5341e1e3963e"
action="${1:-}"
provider="${2:-}"
requested_version="${3:-}"

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required"
}

retry() {
  local attempt=1
  until "$@"; do
    [ "$attempt" -ge 3 ] && return 1
    attempt=$((attempt + 1))
    sleep "$attempt"
  done
}

version_tag() {
  if [ -n "$requested_version" ]; then
    [[ "$requested_version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-beta\.[0-9]+)?$ ]] || fail "invalid version"
    printf '%s\n' "$requested_version"
    return
  fi
  local value
  value="$(curl -fsSL "$release_api" | sed -n 's/^[[:space:]]*"tag_name":[[:space:]]*"v\([^"]*\)".*/\1/p' | head -n 1)"
  [ -n "$value" ] || fail "unable to resolve Better Codex version"
  printf 'v%s\n' "$value"
}

checkout_source() {
  local directory="$1"
  local target="$2"
  local expected
  if [ ! -d "$directory/.git" ]; then
    [ ! -e "$directory" ] || fail "$directory already exists"
    install -d -m 755 "$(dirname "$directory")"
    git clone "$repository" "$directory"
  fi
  git -C "$directory" fetch --force origin "refs/tags/$target:refs/tags/$target"
  git -C "$directory" status --porcelain --untracked-files=no | grep -q . && fail "$directory has local changes"
  expected="$(release_source_commit "$target")"
  git -C "$directory" checkout --detach "$expected"
  [ "$(git -C "$directory" rev-parse HEAD)" = "$expected" ] || fail "source commit does not match the signed release"
}

prepare_source() {
  local directory="$1"
  local target="$2"
  [ ! -e "$directory" ] || fail "$directory already exists"
  checkout_source "$directory" "$target"
}

safe_existing_source() {
  local directory="$1"
  [ ! -L "$directory" ] || fail "$directory must not be a symbolic link"
  [ -d "$directory/.git" ] || return 1
  [ "$(git -C "$directory" remote get-url origin)" = "$repository" ] || fail "$directory has an unexpected Git remote"
  git -C "$directory" status --porcelain --untracked-files=no | grep -q . && fail "$directory has local changes"
}

prepare_install_source() {
  local directory="$1"
  local target="$2"
  if [ -e "$directory" ]; then
    safe_existing_source "$directory" || fail "$directory already exists and is not a Better Codex checkout"
    checkout_source "$directory" "$target"
    return
  fi
  prepare_source "$directory" "$target"
}

write_secret() {
  local path="$1"
  local value="$2"
  local temporary
  [ ! -L "$path" ] || fail "$path must not be a symbolic link"
  temporary="$(mktemp "${path}.XXXXXX")"
  printf '%s' "$value" > "$temporary"
  chmod 600 "$temporary"
  mv -f "$temporary" "$path"
}

release_asset() {
  local target="$1"
  local name="$2"
  local output="$3"
  retry curl -fsSL --connect-timeout 15 --max-time 300 --retry 2 "$release_download/$target/$name" -o "$output"
}

verify_release_asset() {
  local target="$1"
  local name="$2"
  local file="$3"
  local work checksums signature key expected actual
  work="$(mktemp -d "${TMPDIR:-/tmp}/better-codex-selfhost-verify.XXXXXX")"
  checksums="$work/checksums.txt"
  signature="$work/checksums.sig"
  key="$work/update-public-key.pem"
  release_asset "$target" checksums.txt "$checksums"
  release_asset "$target" checksums.sig "$signature"
  release_asset "$target" update-public-key.pem "$key"
  if command -v sha256sum >/dev/null 2>&1; then actual="$(tr -d '\r' < "$key" | sha256sum | awk '{print $1}')"; else actual="$(tr -d '\r' < "$key" | shasum -a 256 | awk '{print $1}')"; fi
  [ "$actual" = "$update_key_sha256" ] || fail "update public key mismatch"
  if command -v node >/dev/null 2>&1; then
    node -e 'const fs=require("fs"),crypto=require("crypto");const [checksums,key,signature]=process.argv.slice(1);process.exit(crypto.verify(null,fs.readFileSync(checksums),fs.readFileSync(key),Buffer.from(fs.readFileSync(signature,"utf8").trim(),"base64"))?0:1)' "$checksums" "$key" "$signature" || fail "release signature verification failed"
  else
    need openssl
    if ! base64 -d < "$signature" > "$work/checksums.sig.bin" 2>/dev/null; then base64 -D < "$signature" > "$work/checksums.sig.bin"; fi
    openssl pkeyutl -verify -pubin -inkey "$key" -rawin -in "$checksums" -sigfile "$work/checksums.sig.bin" >/dev/null || fail "release signature verification failed"
  fi
  expected="$(awk -v asset="$name" '$2 == asset { print $1 }' "$checksums")"
  [ -n "$expected" ] || fail "release checksum missing for $name"
  if command -v sha256sum >/dev/null 2>&1; then actual="$(sha256sum "$file" | awk '{print $1}')"; else actual="$(shasum -a 256 "$file" | awk '{print $1}')"; fi
  [ "$expected" = "$actual" ] || fail "release checksum mismatch for $name"
}

release_source_commit() {
  local target="$1"
  local work commit
  work="$(mktemp -d "${TMPDIR:-/tmp}/better-codex-source-verify.XXXXXX")"
  release_asset "$target" source-commit.txt "$work/source-commit.txt"
  verify_release_asset "$target" source-commit.txt "$work/source-commit.txt"
  commit="$(tr -d '\r\n' < "$work/source-commit.txt")"
  [[ "$commit" =~ ^[a-f0-9]{40}$ ]] || fail "invalid release source commit"
  printf '%s\n' "$commit"
}

verify_tag_commit() {
  local directory="$1"
  local target="$2"
  local expected
  git -C "$directory" fetch --force origin "refs/tags/$target:refs/tags/$target"
  expected="$(release_source_commit "$target")"
  [ "$(git -C "$directory" rev-parse "$target^{commit}")" = "$expected" ] || fail "release tag does not match the signed source commit"
}

verify_running_installer() {
  local target="$1"
  local source="${BASH_SOURCE[0]:-}"
  [ -f "$source" ] || return
  case "$source" in
    /dev/fd/*|/proc/self/fd/*) return ;;
  esac
  verify_release_asset "$target" selfhost.sh "$source"
}

install_vps() {
  [ "$(id -u)" -eq 0 ] || fail "VPS installation must run with sudo"
  need curl
  need git
  need openssl
  need docker
  docker compose version >/dev/null 2>&1 || fail "Docker Compose is required"
  local domain username password target directory
  printf 'Remote access domain: ' >/dev/tty
  IFS= read -r domain </dev/tty
  [[ "$domain" =~ ^[A-Za-z0-9.-]+$ ]] || fail "invalid domain"
  printf 'Web username [admin]: ' >/dev/tty
  IFS= read -r username </dev/tty
  username="${username:-admin}"
  [[ "$username" =~ ^[A-Za-z0-9][A-Za-z0-9._@-]{2,63}$ ]] || fail "invalid username"
  printf 'Web password: ' >/dev/tty
  IFS= read -r -s password </dev/tty
  printf '\n' >/dev/tty
  [ "${#password}" -ge 12 ] || fail "password must contain at least 12 characters"
  target="$(version_tag)"
  directory="${BETTER_CODEX_SELFHOST_DIR:-/opt/better-codex}"
  prepare_install_source "$directory" "$target"
  install -d -m 700 "$directory/deploy/hub/secrets"
  umask 077
  [ -f "$directory/deploy/hub/secrets/bootstrap-secret.txt" ] || write_secret "$directory/deploy/hub/secrets/bootstrap-secret.txt" "$(openssl rand -hex 32)"
  write_secret "$directory/deploy/hub/secrets/web-password.txt" "$password"
  write_secret "$directory/deploy/hub/.env" "BETTER_CODEX_HUB_DOMAIN=$domain
BETTER_CODEX_HUB_WEB_USERNAME=$username
"
  docker compose -f "$directory/deploy/hub/compose.yaml" --env-file "$directory/deploy/hub/.env" up -d --build --wait
  printf 'Better Codex Hub %s is starting at https://%s\n' "$target" "$domain"
}

upgrade_vps() {
  [ "$(id -u)" -eq 0 ] || fail "VPS upgrade must run with sudo"
  need curl
  need git
  need docker
  docker compose version >/dev/null 2>&1 || fail "Docker Compose is required"
  local target directory compose environment
  target="$(version_tag)"
  directory="${BETTER_CODEX_SELFHOST_DIR:-/opt/better-codex}"
  compose="$directory/deploy/hub/compose.yaml"
  environment="$directory/deploy/hub/.env"
  [ -f "$compose" ] && [ -f "$environment" ] || fail "Better Codex Hub is not installed in $directory"
  local previous
  previous="$(git -C "$directory" rev-parse HEAD)"
  verify_tag_commit "$directory" "$target"
  docker compose -f "$compose" --env-file "$environment" exec -T --user node hub node dist/hub-cli.js backup >/dev/null
  checkout_source "$directory" "$target"
  if ! docker compose -f "$compose" --env-file "$environment" up -d --build --wait; then
    git -C "$directory" checkout --detach "$previous"
    docker compose -f "$compose" --env-file "$environment" up -d --build --wait
    fail "VPS upgrade failed and the previous version was restored"
  fi
  if ! docker compose -f "$compose" --env-file "$environment" exec -T -e TARGET_VERSION="${target#v}" hub node -e 'fetch("http://127.0.0.1:4318/healthz").then(response=>response.json()).then(value=>{if(value.ok!==true||value.version!==process.env.TARGET_VERSION)process.exit(1)})'; then
    git -C "$directory" checkout --detach "$previous"
    docker compose -f "$compose" --env-file "$environment" up -d --build --wait
    fail "VPS upgrade health check failed and the previous version was restored"
  fi
  printf 'Better Codex Hub upgraded to %s\n' "$target"
}

cloudflare_directory() {
  printf '%s\n' "${BETTER_CODEX_SELFHOST_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/better-codex-cloudflare}"
}

install_cloudflare() {
  need curl
  need git
  need npm
  need openssl
  local password admin_token target directory deploy_output worker_url
  printf 'Web password: ' >/dev/tty
  IFS= read -r -s password </dev/tty
  printf '\n' >/dev/tty
  [ "${#password}" -ge 12 ] || fail "password must contain at least 12 characters"
  target="$(version_tag)"
  directory="$(cloudflare_directory)"
  prepare_install_source "$directory" "$target"
  npm --prefix "$directory/deploy/cloudflare" ci --ignore-scripts
  cd "$directory/deploy/cloudflare"
  npx --no-install wrangler login
  npx --no-install wrangler whoami
  if ! npx --no-install wrangler r2 bucket create better-codex-hub-backups >/dev/null 2>&1; then
    npx --no-install wrangler r2 bucket list | grep -Fq better-codex-hub-backups || fail "unable to create the Cloudflare backup bucket"
  fi
  if [ -f .admin-token ]; then admin_token="$(cat .admin-token)"; else admin_token="$(openssl rand -hex 32)"; fi
  umask 077
  write_secret .admin-token "$admin_token"
  printf '%s' "$admin_token" | npx --no-install wrangler secret put ADMIN_TOKEN >/dev/null
  printf '%s' "$password" | npx --no-install wrangler secret put WEB_PASSWORD >/dev/null
  deploy_output="$(npx --no-install wrangler deploy 2>&1 | tee /dev/tty)"
  worker_url="$(printf '%s\n' "$deploy_output" | sed -n 's#.*\(https://[^[:space:]]*\.workers\.dev\).*#\1#p' | tail -n 1)"
  [ -n "$worker_url" ] || fail "unable to resolve the deployed Worker URL"
  write_secret .worker-url "${worker_url%/}"
  curl -fsSL --retry 3 "${worker_url%/}/healthz" | node -e 'let value="";process.stdin.on("data",chunk=>value+=chunk).on("end",()=>{const result=JSON.parse(value);if(result.ok!==true||result.deployment!=="cloudflare")process.exit(1)})' || fail "Cloudflare deployment health check failed"
  printf 'Better Codex Hub %s is available at %s\n' "$target" "${worker_url%/}"
  printf 'Cloudflare administrator token stored at %s\n' "$directory/deploy/cloudflare/.admin-token"
}

upgrade_cloudflare() {
  need curl
  need git
  need npm
  local target directory
  target="$(version_tag)"
  directory="$(cloudflare_directory)"
  [ -f "$directory/deploy/cloudflare/wrangler.toml" ] || fail "Better Codex Cloudflare Hub is not installed in $directory"
  local admin_token previous worker_url
  admin_token="$(cat "$directory/deploy/cloudflare/.admin-token")"
  [ -n "$admin_token" ] || fail "Cloudflare administrator token is unavailable"
  worker_url="$(cat "$directory/deploy/cloudflare/.worker-url")"
  [ -n "$worker_url" ] || fail "Cloudflare Hub URL is unavailable"
  previous="$(git -C "$directory" rev-parse HEAD)"
  verify_tag_commit "$directory" "$target"
  curl -fsSL -X POST -H "authorization: Bearer $admin_token" "${worker_url%/}/api/v1/admin/backup" >/dev/null || fail "Cloudflare backup failed"
  checkout_source "$directory" "$target"
  npm --prefix "$directory/deploy/cloudflare" ci --ignore-scripts
  cd "$directory/deploy/cloudflare"
  npx --no-install wrangler whoami
  if ! npx --no-install wrangler deploy || ! curl -fsSL --retry 3 "${worker_url%/}/healthz" | TARGET_VERSION="${target#v}" node -e 'let value="";process.stdin.on("data",chunk=>value+=chunk).on("end",()=>{const result=JSON.parse(value);if(result.ok!==true||result.deployment!=="cloudflare"||result.version!==process.env.TARGET_VERSION)process.exit(1)})'; then
    git -C "$directory" checkout --detach "$previous"
    npm ci --ignore-scripts
    npx --no-install wrangler deploy
    fail "Cloudflare upgrade failed and the previous version was restored"
  fi
}

target_version="$(version_tag)"
if [ "${BETTER_CODEX_SELFHOST_VERIFIED:-0}" != 1 ]; then
  if [ -t 0 ]; then
    verify_running_installer "$target_version"
  else
    verification_directory="$(mktemp -d "${TMPDIR:-/tmp}/better-codex-selfhost-command.XXXXXX")"
    verification_script="$verification_directory/selfhost.sh"
    release_asset "$target_version" selfhost.sh "$verification_script"
    verify_release_asset "$target_version" selfhost.sh "$verification_script"
    export BETTER_CODEX_SELFHOST_VERIFIED=1
    exec bash "$verification_script" "$action" "$provider" "$target_version"
  fi
fi

case "$action:$provider" in
  install:vps) install_vps ;;
  upgrade:vps) upgrade_vps ;;
  install:cloudflare) install_cloudflare ;;
  upgrade:cloudflare) upgrade_cloudflare ;;
  *) fail "usage: selfhost.sh install|upgrade vps|cloudflare [version]" ;;
esac
