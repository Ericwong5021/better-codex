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
  python3 /usr/local/libexec/better-codex-selfhost-update-state progress "$@"
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
  need python3
  need flock
  install -d -m 755 /etc/better-codex /usr/local/libexec
  install -d -o root -g "${BETTER_CODEX_HUB_CONTAINER_GID:-1000}" -m 2770 /var/lib/better-codex-updater
  install -d -o root -g "${BETTER_CODEX_HUB_CONTAINER_GID:-1000}" -m 2770 /var/lib/better-codex-updater/operations /var/lib/better-codex-updater/requests
  install -m 0755 "$directory/scripts/selfhost-updater.sh" /usr/local/libexec/better-codex-selfhost-updater.next
  mv -f /usr/local/libexec/better-codex-selfhost-updater.next /usr/local/libexec/better-codex-selfhost-updater
  install -m 0755 "$directory/scripts/selfhost-update-state.py" /usr/local/libexec/better-codex-selfhost-update-state.next
  mv -f /usr/local/libexec/better-codex-selfhost-update-state.next /usr/local/libexec/better-codex-selfhost-update-state
  install -m 0755 "$directory/scripts/selfhost.sh" /usr/local/libexec/better-codex-selfhost.next
  mv -f /usr/local/libexec/better-codex-selfhost.next /usr/local/libexec/better-codex-selfhost
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

configure_vps_environment() {
  [ ! -L "$1" ] || fail "$1 must not be a symbolic link"
  python3 - "$1" "$2" "${BETTER_CODEX_RELAY_UPDATE_CHANNEL:-}" "${3:-}" "${4:-}" <<'PY'
import json, os, re, shlex, sys, tempfile
path, target, override, domain, username = sys.argv[1:]
text = open(path).read() if os.path.exists(path) else ""
key = "BETTER_CODEX_RELAY_UPDATE_CHANNEL"
pattern = r"(?m)^[ \t]*(?:export[ \t]+)?" + key + r"[ \t]*=(.*)$"
matches = list(re.finditer(pattern, text))
values = shlex.split(matches[-1].group(1), comments=True) if matches else []
if len(values) > 1:
    raise SystemExit("invalid Relay update channel")
existing = values[0] if values else ""
channel = override or existing or ("preview" if "-beta." in target else "stable")
if channel not in ("stable", "preview"):
    raise SystemExit("invalid Relay update channel")
updates = {key: channel}
if domain:
    updates["BETTER_CODEX_HUB_DOMAIN"] = domain
if username:
    updates["BETTER_CODEX_HUB_WEB_USERNAME"] = username
for name, value in updates.items():
    expression = r"(?m)^[ \t]*(?:export[ \t]+)?" + name + r"[ \t]*=.*$"
    replacement = name + "=" + value
    if re.search(expression, text):
        text = re.sub(expression, lambda _: replacement, text)
    else:
        text = text.rstrip("\n") + "\n" + replacement + "\n"
descriptor, temporary = tempfile.mkstemp(dir=os.path.dirname(path))
with os.fdopen(descriptor, "w") as stream:
    stream.write(text)
    stream.flush()
    os.fsync(stream.fileno())
os.replace(temporary, path)
directory = os.open(os.path.dirname(path), os.O_RDONLY)
try:
    os.fsync(directory)
finally:
    os.close(directory)
print("BETTER_CODEX_DIAGNOSTIC " + json.dumps(dict(scope="vps_update", event="channel_configured", target_version=target, channel=channel, source="override" if override else "configuration" if existing else "selected_version")), file=sys.stderr)
PY
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
  [ "${#password}" -ge 8 ] || fail "password must contain at least 8 characters"
  target="$(version_tag)"
  directory="${BETTER_CODEX_SELFHOST_DIR:-/opt/better-codex}"
  prepare_install_source "$directory" "$target"
  configure_vps_updater "$directory"
  install -d -m 700 "$directory/deploy/hub/secrets"
  umask 077
  [ -f "$directory/deploy/hub/secrets/bootstrap-secret.txt" ] || write_secret "$directory/deploy/hub/secrets/bootstrap-secret.txt" "$(openssl rand -hex 32)"
  write_secret "$directory/deploy/hub/secrets/web-password.txt" "$password"
  configure_vps_environment "$directory/deploy/hub/.env" "$target" "$domain" "$username"
  docker compose -f "$directory/deploy/hub/compose.yaml" --env-file "$directory/deploy/hub/.env" --profile standalone up -d --build --wait
  verify_vps_updater -f "$directory/deploy/hub/compose.yaml" --env-file "$directory/deploy/hub/.env" --profile standalone || fail "VPS online updater is unavailable"
  printf 'Better Codex Relay %s is starting at https://%s\n' "$target" "$domain"
}

upgrade_vps() (
  [ "$(id -u)" -eq 0 ] || fail "VPS upgrade must run with sudo"
  need curl
  need git
  need docker
  need python3
  need flock
  docker compose version >/dev/null 2>&1 || fail "Docker Compose is required"
  target= directory= compose= proxy_compose= environment= operation_id= transaction= snapshot= metadata= previous= previous_version= previous_image= caddy_image= target_commit= domain= external_proxy=
  compose_args=() up_services=() recovery_args=()
  target="$(version_tag)"
  directory="${BETTER_CODEX_SELFHOST_DIR:-/opt/better-codex}"
  compose="$directory/deploy/hub/compose.yaml"
  proxy_compose="$directory/deploy/hub/compose.proxy.yaml"
  environment="$directory/deploy/hub/.env"
  [ -f "$compose" ] && [ -f "$environment" ] || fail "Better Codex Relay is not installed in $directory"
  exec 9>"$directory/.git/better-codex-deployment.lock"
  flock -n 9 || fail "VPS update is already running"
  operation_id="${BETTER_CODEX_UPDATER_OPERATION_ID:-$(python3 -c 'import uuid; print(uuid.uuid4())')}"
  [[ "$operation_id" =~ ^[a-fA-F0-9-]{36}$ ]] || fail "invalid updater operation ID"
  transaction="$directory/.git/better-codex-updates/$operation_id"
  snapshot="$transaction/compose.json"
  metadata="$transaction/transaction.json"
  mkdir -p "$transaction"
  chmod 700 "$transaction"
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
  journal_phase() {
    python3 - "$metadata" "$1" <<'PY'
import json, os, sys, time
path, phase = sys.argv[1:]
value = json.load(open(path))
value.update(phase=phase, updatedAt=time.time())
with open(path + ".tmp", "w") as stream:
    json.dump(value, stream)
    stream.flush()
    os.fsync(stream.fileno())
os.replace(path + ".tmp", path)
PY
  }
  verify_deployment() {
    local version="$1"; shift
    docker compose "$@" exec -T -e TARGET_VERSION="$version" hub node -e 'const deadline=Date.now()+120000; (async()=>{while(true){try{const response=await fetch("http://127.0.0.1:4318/readyz",{signal:AbortSignal.timeout(5000)});const value=await response.json();if(response.ok&&value.ok===true&&value.version===process.env.TARGET_VERSION)return;console.error(JSON.stringify({event:"update_readiness_pending",target:process.env.TARGET_VERSION,status:response.status,value}));}catch(error){console.error(JSON.stringify({event:"update_readiness_failed",target:process.env.TARGET_VERSION,error:String(error)}));}if(Date.now()>=deadline)process.exit(1);await new Promise(resolve=>setTimeout(resolve,2000));}})()' || return 1
    if [ -n "$domain" ]; then
      local public_health
      [[ "$domain" =~ ^[A-Za-z0-9.-]+$ ]] || return 1
      public_health="$(retry curl -fsSL --connect-timeout 15 --max-time 30 "https://$domain/readyz")" || return 1
      printf '%s' "$public_health" | python3 -c 'import json,sys; value=json.load(sys.stdin); sys.exit(0 if value.get("ok") is True and value.get("version")==sys.argv[1] else 1)' "$version" || return 1
    fi
  }
  rollback_vps() {
    journal_phase rolling_back || return 1
    write_upgrade_progress restoring 40 pending || return 1
    docker image inspect "$previous_image" >/dev/null || return 1
    git -C "$directory" checkout --detach "$previous" || return 1
    if [ -f "$transaction/environment.env" ]; then
      python3 - "$transaction/environment.env" "$environment" <<'PY' || return 1
import os, shutil, sys
source, destination = sys.argv[1:]
shutil.copy2(source, destination + ".restoring")
with open(destination + ".restoring", "rb") as stream:
    os.fsync(stream.fileno())
os.replace(destination + ".restoring", destination)
directory = os.open(os.path.dirname(destination), os.O_RDONLY)
try:
    os.fsync(directory)
finally:
    os.close(directory)
PY
    fi
    docker compose "${recovery_args[@]}" up -d --no-build --wait "${up_services[@]}" || return 1
    verify_deployment "$previous_version" "${recovery_args[@]}" || return 1
    journal_phase restored || return 1
    write_upgrade_progress restored 100 restored "$previous_version" || return 1
  }
  if [ -f "$metadata" ]; then
    [ "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["target"])' "$metadata")" = "$target" ] || fail "update target changed"
  else
    docker compose "${compose_args[@]}" config --quiet
    local free_kib total_kib
    read -r total_kib free_kib < <(df -Pk "$directory" | awk 'NR==2 {print $2, $4}')
    [[ "$free_kib" =~ ^[0-9]+$ && "$total_kib" =~ ^[0-9]+$ ]] || fail "unable to inspect VPS update storage"
    [ "$total_kib" -gt 0 ] && [ "$free_kib" -ge 5242880 ] && [ "$((free_kib * 100 / total_kib))" -ge 5 ] || fail "VPS update blocked by storage warning reserve"
    write_upgrade_progress verifying 20
    target_commit="$(release_source_commit "$target")"
    [ -z "${BETTER_CODEX_UPDATER_SOURCE_COMMIT:-}" ] || [ "$target_commit" = "$BETTER_CODEX_UPDATER_SOURCE_COMMIT" ] || fail "source commit changed after update acceptance"
    git -C "$directory" fetch --force origin "refs/tags/$target:refs/tags/$target"
    [ "$(git -C "$directory" rev-parse "$target^{commit}")" = "$target_commit" ] || fail "release tag does not match the signed source commit"
    previous="$(git -C "$directory" rev-parse HEAD)"
    previous_version="$(docker compose "${compose_args[@]}" exec -T hub node -e 'fetch("http://127.0.0.1:4318/readyz").then(async r=>{const v=await r.json();if(!r.ok||v.ok!==true)process.exit(1);process.stdout.write(v.version)})')"
    previous_image="$(docker inspect --format '{{.Image}}' "$(docker compose "${compose_args[@]}" ps -q hub)")"
    docker image tag "$previous_image" "better-codex-rollback:$operation_id"
    caddy_image=""
    if [ "$external_proxy" -eq 0 ]; then
      caddy_image="$(docker inspect --format '{{.Image}}' "$(docker compose "${compose_args[@]}" ps -q caddy)")"
      docker image tag "$caddy_image" "better-codex-caddy-rollback:$operation_id"
    fi
    docker compose "${compose_args[@]}" config --format json > "$snapshot"
    domain="$(sed -n 's/^BETTER_CODEX_HUB_DOMAIN=//p' "$environment" | tail -n 1)"
    [[ "$domain" =~ ^[A-Za-z0-9.-]+$ ]] || fail "public readiness domain is required"
    python3 - "$snapshot" "$metadata" "$previous" "$previous_version" "$previous_image" "$target" "$target_commit" "$domain" "$external_proxy" "$caddy_image" "$environment" <<'PY'
import json, os, shutil, sys
snapshot, metadata, previous, version, image, target, commit, domain, proxy, caddy, environment = sys.argv[1:]
saved_environment = os.path.join(os.path.dirname(snapshot), "environment.env")
shutil.copy2(environment, saved_environment)
with open(saved_environment, "rb") as stream:
    os.fsync(stream.fileno())
value = json.load(open(snapshot))
value["services"]["hub"].pop("build", None)
value["services"]["hub"]["image"] = image
if caddy:
    value["services"]["caddy"]["image"] = caddy
for volume in value.get("services", {}).get("caddy", {}).get("volumes", []):
    if volume.get("type") == "bind" and os.path.isfile(volume.get("source", "")):
        saved = os.path.join(os.path.dirname(snapshot), "Caddyfile")
        shutil.copy2(volume["source"], saved)
        volume["source"] = saved
with open(snapshot, "w") as stream:
    json.dump(value, stream)
    stream.flush()
    os.fsync(stream.fileno())
with open(metadata, "w") as stream:
    json.dump(dict(schemaVersion=2, phase="prepared", previous=previous, sourceVersion=version, image=image, target=target, commit=commit, domain=domain, externalProxy=proxy), stream)
    stream.flush()
    os.fsync(stream.fileno())
PY
  fi
  previous="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["previous"])' "$metadata")"
  previous_version="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["sourceVersion"])' "$metadata")"
  previous_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["image"])' "$metadata")"
  target_commit="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["commit"])' "$metadata")"
  domain="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["domain"])' "$metadata")"
  recovery_args=(-f "$snapshot" --profile standalone)
  finish_upgrade() {
    local status=$?
    trap - EXIT
    if [ "$status" -ne 0 ]; then
      if rollback_vps; then
        printf 'BETTER_CODEX_DIAGNOSTIC {"scope":"vps_update","update_id":"%s","event":"rollback_verified","source_version":"%s"}\n' "$operation_id" "$previous_version" >&2
      else
        journal_phase recovery_failed
        write_upgrade_progress recovery_failed 0 failed
        printf 'BETTER_CODEX_DIAGNOSTIC {"scope":"vps_update","update_id":"%s","event":"rollback_failed"}\n' "$operation_id" >&2
      fi
    fi
    exit "$status"
  }
  trap finish_upgrade EXIT
  if [ "${BETTER_CODEX_UPDATER_RECOVER:-0}" = "1" ]; then
    if [ "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["phase"])' "$metadata")" = "verified" ]; then
      verify_deployment "${target#v}" "${compose_args[@]}"
      write_upgrade_progress verified 100
      return 0
    fi
    trap - EXIT
    if ! rollback_vps; then
      journal_phase recovery_failed
      write_upgrade_progress recovery_failed 0 failed
    fi
    return 1
  fi
  write_upgrade_progress downloading 45
  git -C "$directory" status --porcelain --untracked-files=no | grep -q . && fail "$directory has local changes"
  git -C "$directory" checkout --detach "$target_commit"
  configure_vps_environment "$environment" "$target"
  write_upgrade_progress rebuilding 60
  docker compose "${compose_args[@]}" build hub
  if [ "$external_proxy" -eq 1 ]; then docker compose "${compose_args[@]}" stop caddy; fi
  journal_phase switching
  write_upgrade_progress restarting 80
  docker compose "${compose_args[@]}" up -d --no-build --wait "${up_services[@]}"
  write_upgrade_progress health_check 90
  verify_deployment "${target#v}" "${compose_args[@]}"
  configure_vps_updater "$directory"
  verify_vps_updater "${compose_args[@]}"
  journal_phase verified
  write_upgrade_progress verified 100
  printf 'Better Codex Relay upgraded to %s\n' "$target"
)

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
