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

write_upgrade_progress() {
  [ -n "${BETTER_CODEX_UPDATER_STATE_FILE:-}" ] || return 0
  [ "$BETTER_CODEX_UPDATER_STATE_FILE" = "/var/lib/better-codex-updater/state.json" ] || fail "invalid updater state file"
  [[ "${BETTER_CODEX_UPDATER_TARGET_VERSION:-}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-beta\.[0-9]+)?$ ]] || fail "invalid updater target version"
  local stage="$1"
  local progress="$2"
  local temporary
  case "$stage" in
    verifying|backing_up|downloading|rebuilding|restarting|health_check) ;;
    *) fail "invalid updater progress stage" ;;
  esac
  [[ "$progress" =~ ^[0-9]+$ ]] && [ "$progress" -le 100 ] || fail "invalid updater progress"
  temporary="$(mktemp "/var/lib/better-codex-updater/state.XXXXXX")"
  printf '{"status":"installing","targetVersion":"%s","stage":"%s","progress":%s,"updatedAt":"%s","error":null}\n' "$BETTER_CODEX_UPDATER_TARGET_VERSION" "$stage" "$progress" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$temporary"
  chmod 644 "$temporary"
  mv -f "$temporary" "$BETTER_CODEX_UPDATER_STATE_FILE"
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

configure_vps_updater() {
  local directory="$1"
  install -d -m 755 /etc/better-codex /usr/local/libexec
  install -d -o root -g "${BETTER_CODEX_HUB_CONTAINER_GID:-1000}" -m 0770 /var/lib/better-codex-updater
  install -m 0755 "$directory/scripts/selfhost-updater.sh" /usr/local/libexec/better-codex-selfhost-updater
  install -m 0755 "$directory/scripts/selfhost.sh" /usr/local/libexec/better-codex-selfhost
  printf '%s\n' "$directory" > /etc/better-codex/updater-directory
  chmod 600 /etc/better-codex/updater-directory
  if ! command -v systemctl >/dev/null 2>&1; then
    rm -f /var/lib/better-codex-updater/ready
    return
  fi
  printf '%s\n' '[Unit]' 'Description=Better Codex Relay online updater' 'After=docker.service network-online.target' '' '[Service]' 'Type=oneshot' 'ExecStart=/usr/local/libexec/better-codex-selfhost-updater' 'Restart=on-failure' 'RestartSec=5s' > /etc/systemd/system/better-codex-updater.service
  printf '%s\n' '[Unit]' 'Description=Watch for Better Codex Relay online update requests' '' '[Path]' 'PathExists=/var/lib/better-codex-updater/request' 'PathExists=/var/lib/better-codex-updater/request.running' 'Unit=better-codex-updater.service' '' '[Install]' 'WantedBy=multi-user.target' > /etc/systemd/system/better-codex-updater.path
  chmod 644 /etc/systemd/system/better-codex-updater.service /etc/systemd/system/better-codex-updater.path
  systemctl daemon-reload
  systemctl enable --now better-codex-updater.path
  touch /var/lib/better-codex-updater/ready
  chown root:"${BETTER_CODEX_HUB_CONTAINER_GID:-1000}" /var/lib/better-codex-updater/ready
  chmod 640 /var/lib/better-codex-updater/ready
}

verify_vps_updater() {
  docker compose "$@" exec -T hub node -e 'const { existsSync } = require("node:fs"); const { join } = require("node:path"); const directory = process.env.BETTER_CODEX_HUB_UPDATER_DIR; if (!directory || !existsSync(join(directory, "ready"))) process.exit(1)'
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
  configure_vps_updater "$directory"
  install -d -m 700 "$directory/deploy/hub/secrets"
  umask 077
  [ -f "$directory/deploy/hub/secrets/bootstrap-secret.txt" ] || write_secret "$directory/deploy/hub/secrets/bootstrap-secret.txt" "$(openssl rand -hex 32)"
  write_secret "$directory/deploy/hub/secrets/web-password.txt" "$password"
  write_secret "$directory/deploy/hub/.env" "BETTER_CODEX_HUB_DOMAIN=$domain
BETTER_CODEX_HUB_WEB_USERNAME=$username
"
  docker compose -f "$directory/deploy/hub/compose.yaml" --env-file "$directory/deploy/hub/.env" --profile standalone up -d --build --wait
  verify_vps_updater -f "$directory/deploy/hub/compose.yaml" --env-file "$directory/deploy/hub/.env" --profile standalone || fail "VPS online updater is unavailable"
  printf 'Better Codex Relay %s is starting at https://%s\n' "$target" "$domain"
}

upgrade_vps() {
  [ "$(id -u)" -eq 0 ] || fail "VPS upgrade must run with sudo"
  need curl
  need git
  need docker
  docker compose version >/dev/null 2>&1 || fail "Docker Compose is required"
  local target directory compose proxy_compose environment backup_output backup backup_cli previous_service previous previous_version domain public_health external_proxy
  local -a compose_args up_services
  target="$(version_tag)"
  directory="${BETTER_CODEX_SELFHOST_DIR:-/opt/better-codex}"
  compose="$directory/deploy/hub/compose.yaml"
  proxy_compose="$directory/deploy/hub/compose.proxy.yaml"
  environment="$directory/deploy/hub/.env"
  [ -f "$compose" ] && [ -f "$environment" ] || fail "Better Codex Relay is not installed in $directory"
  compose_args=(-f "$compose" --env-file "$environment")
  up_services=()
  external_proxy=0
  if [ -f "$proxy_compose" ]; then
    compose_args+=(-f "$proxy_compose")
    up_services=(hub)
    external_proxy=1
  else
    compose_args+=(--profile standalone)
  fi
  docker compose "${compose_args[@]}" config --quiet
  if [ "$external_proxy" -eq 1 ]; then
    docker compose "${compose_args[@]}" stop caddy
  fi
  previous="$(git -C "$directory" rev-parse HEAD)"
  previous_version="$(git -C "$directory" show "${previous}:package.json" | sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
  [ -n "$previous_version" ] || fail "unable to resolve the installed VPS version"
  write_upgrade_progress verifying 20
  verify_tag_commit "$directory" "$target"
  previous_service="$(docker compose "${compose_args[@]}" exec -T hub node -e 'fetch("http://127.0.0.1:4318/healthz").then(response=>response.json()).then(value=>process.stdout.write(String(value.name||"")))')"
  case "$previous_service" in
    'Better Codex Relay') backup_cli=dist/relay-cli.js ;;
    'Better Codex Hub') backup_cli=dist/hub-cli.js ;;
    *) fail "unable to identify the installed remote service" ;;
  esac
  write_upgrade_progress backing_up 35
  backup_output="$(docker compose "${compose_args[@]}" exec -T --user node hub node "$backup_cli" backup)"
  backup="$(printf '%s\n' "$backup_output" | sed -n 's/^[[:space:]]*"backup":[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
  [[ "$backup" == /data/backups/*.db ]] || fail "VPS backup path is invalid"
  rollback_vps() {
    git -C "$directory" checkout --detach "$previous"
    docker compose "${compose_args[@]}" stop hub
    docker compose "${compose_args[@]}" build hub
    docker compose "${compose_args[@]}" run --rm --no-deps hub node "$backup_cli" restore "$backup"
    docker compose "${compose_args[@]}" up -d --wait "${up_services[@]}"
    docker compose "${compose_args[@]}" exec -T -e TARGET_VERSION="$previous_version" hub node -e 'fetch("http://127.0.0.1:4318/healthz").then(response=>response.json()).then(value=>{if(value.ok!==true||value.version!==process.env.TARGET_VERSION)process.exit(1)})'
  }
  write_upgrade_progress downloading 50
  checkout_source "$directory" "$target"
  if ! configure_vps_updater "$directory"; then
    git -C "$directory" checkout --detach "$previous"
    fail "VPS online updater configuration failed"
  fi
  write_upgrade_progress rebuilding 65
  if ! docker compose "${compose_args[@]}" up -d --build --wait "${up_services[@]}"; then
    rollback_vps
    fail "VPS upgrade failed and the previous version was restored"
  fi
  if ! verify_vps_updater "${compose_args[@]}"; then
    rollback_vps
    fail "VPS online updater verification failed and the previous version was restored"
  fi
  write_upgrade_progress health_check 90
  if ! docker compose "${compose_args[@]}" exec -T -e TARGET_VERSION="${target#v}" hub node -e 'fetch("http://127.0.0.1:4318/healthz").then(response=>response.json()).then(value=>{if(value.ok!==true||value.version!==process.env.TARGET_VERSION)process.exit(1)})'; then
    rollback_vps
    fail "VPS upgrade health check failed and the previous version was restored"
  fi
  domain="$(sed -n 's/^BETTER_CODEX_HUB_DOMAIN=//p' "$environment" | tail -n 1)"
  if [ -n "$domain" ]; then
    [[ "$domain" =~ ^[A-Za-z0-9.-]+$ ]] || {
      rollback_vps
      fail "VPS public domain is invalid and the previous version was restored"
    }
    if ! public_health="$(retry curl -fsSL --connect-timeout 15 --max-time 30 "https://$domain/healthz")" || ! grep -Fq '"ok":true' <<< "$public_health" || ! grep -Fq '"version":"'"${target#v}"'"' <<< "$public_health"; then
      rollback_vps
      fail "VPS public health check failed and the previous version was restored"
    fi
  fi
  printf 'Better Codex Relay upgraded to %s\n' "$target"
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
  *) fail "usage: selfhost.sh install|upgrade vps [version]" ;;
esac
