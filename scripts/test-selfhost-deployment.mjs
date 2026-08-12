import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import https from "node:https";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const composeFile = join(root, "deploy/hub/compose.yaml");
const directory = mkdtempSync(join(tmpdir(), "better-codex-deploy-"));
const project = `better-codex-acceptance-${process.pid}`.toLowerCase();
const bootstrapSecret = randomBytes(40).toString("base64url");
const webPassword = `Test-${randomBytes(24).toString("base64url")}`;
const webUsername = "acceptance";
const bootstrapFile = join(directory, "bootstrap.txt");
const passwordFile = join(directory, "password.txt");
const caddyFile = join(directory, "Caddyfile");
writeFileSync(bootstrapFile, bootstrapSecret, { mode: 0o600 });
writeFileSync(passwordFile, webPassword, { mode: 0o600 });
writeFileSync(caddyFile, "localhost {\n\ttls internal\n\tencode zstd gzip\n\treverse_proxy hub:4318\n}\n");

function compose(args, environment, quiet = false) {
  const result = spawnSync("docker", ["compose", "-p", project, "-f", composeFile, ...args], { cwd: root, env: environment, encoding: "utf8", stdio: quiet ? "pipe" : "inherit" });
  if (result.status !== 0 && quiet) throw new Error(`${result.stderr || result.stdout || "docker_compose_failed"}`.trim());
  if (result.status !== 0) throw new Error(`docker_compose_${args[0]}_failed`);
}

function composeOutput(args, environment) {
  const result = spawnSync("docker", ["compose", "-p", project, "-f", composeFile, ...args], { cwd: root, env: environment, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${result.stderr || result.stdout || "docker_compose_failed"}`.trim());
  return result.stdout.trim();
}

function request(portValue, path, options = {}) {
  return new Promise((resolveRequest, reject) => {
    const body = options.body === undefined ? null : JSON.stringify(options.body);
    const request = https.request({ hostname: "localhost", port: portValue, path, method: options.method || "GET", rejectUnauthorized: false, headers: { ...(body ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : {}), ...(options.headers || {}) } }, response => {
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let value = text;
        try { value = text ? JSON.parse(text) : null; } catch {}
        resolveRequest({ status: response.statusCode || 0, headers: response.headers, value });
      });
    });
    request.once("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

async function waitForHub(portValue) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await request(portValue, "/healthz");
      if (response.status === 200 && response.value?.ok === true) return;
    } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 500));
  }
  throw new Error("deployment_health_timeout");
}

const environment = {
  ...process.env,
  BETTER_CODEX_HUB_DOMAIN: "localhost",
  BETTER_CODEX_HUB_HTTP_PORT: "0",
  BETTER_CODEX_HUB_HTTPS_PORT: "0",
  BETTER_CODEX_HUB_CADDYFILE: caddyFile,
  BETTER_CODEX_HUB_BOOTSTRAP_SECRET_FILE: bootstrapFile,
  BETTER_CODEX_HUB_WEB_PASSWORD_FILE: passwordFile,
  BETTER_CODEX_HUB_WEB_USERNAME: webUsername,
};

try {
  compose(["build", "hub"], environment);
  compose(["up", "-d", "--wait"], environment);
  assert.match(composeOutput(["exec", "-T", "hub", "sh", "-c", "sed -n 's/^Uid:[[:space:]]*\\([0-9]*\\).*/\\1/p' /proc/1/status"], environment), /^1000$/);
  const portLine = composeOutput(["port", "caddy", "443"], environment).split("\n").find(line => /:\d+$/.test(line));
  const httpsPort = Number(portLine?.match(/:(\d+)$/)?.[1]);
  if (!Number.isInteger(httpsPort) || httpsPort < 1) throw new Error("published_https_port_unavailable");
  await waitForHub(httpsPort);
  const baseOrigin = `https://localhost:${httpsPort}`;
  const adminHeaders = { authorization: `Bearer ${bootstrapSecret}` };
  const pairing = await request(httpsPort, "/api/v1/admin/pairing-codes", { method: "POST", headers: adminHeaders, body: {} });
  assert.equal(pairing.status, 201);
  const device = await request(httpsPort, "/api/v1/devices/pair", { method: "POST", body: { name: "Deployment acceptance", pairing_code: pairing.value.pairing_code } });
  assert.equal(device.status, 201);
  const timestamp = new Date().toISOString();
  const projectProjection = { id: "deployment-project", name: "Deployment acceptance", identifier_prefix: "DEP", created_at: timestamp, updated_at: timestamp, local_revision: 1 };
  const issueProjection = { id: "deployment-issue", identifier: "DEP-1", project_id: projectProjection.id, title: "Container synchronized", description: "Acceptance", status: "todo", priority: "medium", labels: [], sort_order: 0, pinned: false, archived_at: null, assigned: false, agent_enabled: false, agent_id: null, user_assigned: false, pending_actor: "user", active_run_status: null, latest_run_status: null, latest_scheduler_status: null, session_status: null, reply_status: "idle", has_conversation: false, last_activity_finished_at: null, needs_attention: false, created_at: timestamp, updated_at: timestamp, local_revision: 1 };
  const runtime = { device_id: device.value.device_id, device_name: device.value.device_name, protocol_version: device.value.protocol_version, core_version: "acceptance", last_seen_at: timestamp, last_sync_at: timestamp, queue_depth: 0, health_state: "online" };
  const deviceHeaders = { authorization: `Bearer ${device.value.device_token}` };
  const pushed = await request(httpsPort, "/api/v1/sync/push", { method: "POST", headers: deviceHeaders, body: { protocol_version: device.value.protocol_version, core_version: "acceptance", device_id: device.value.device_id, runtime, changes: [
    { event_id: randomUUID(), entity_type: "project", entity_id: projectProjection.id, operation: "upsert", projection: projectProjection, changed_at: timestamp },
    { event_id: randomUUID(), entity_type: "issue", entity_id: issueProjection.id, operation: "upsert", projection: issueProjection, changed_at: timestamp },
  ] } });
  assert.equal(pushed.status, 200);

  const login = await request(httpsPort, "/web/session", { method: "POST", headers: { origin: baseOrigin }, body: { username: webUsername, password: webPassword } });
  assert.equal(login.status, 200);
  assert.equal(Object.hasOwn(login.value, "token"), false);
  const cookie = String(login.headers["set-cookie"]?.[0] || "").split(";", 1)[0];
  assert.ok(cookie.startsWith("better_codex_session="));
  const browserHeaders = { cookie, origin: baseOrigin, "x-csrf-token": login.value.csrf_token };
  const board = await request(httpsPort, "/api/v1/board", { headers: { cookie } });
  assert.equal(board.status, 200);
  assert.equal(board.value.issues[0].title, "Container synchronized");
  const pending = await request(httpsPort, `/api/issues/${issueProjection.id}`, { method: "PATCH", headers: browserHeaders, body: { version: 1, title: "Container command pending", command_id: "deployment-command" } });
  assert.equal(pending.status, 202);
  assert.equal(pending.value.remote_pending, true);
  const commands = await request(httpsPort, "/api/v1/sync/commands", { headers: deviceHeaders });
  assert.equal(commands.status, 200);
  assert.equal(commands.value.commands[0].command_id, "deployment-command");
  const acknowledgedProjection = { ...issueProjection, title: "Container command applied", local_revision: 2, updated_at: new Date().toISOString() };
  const acknowledged = await request(httpsPort, "/api/v1/sync/commands/deployment-command/ack", { method: "POST", headers: deviceHeaders, body: { status: "applied", projection: acknowledgedProjection, error: null } });
  assert.equal(acknowledged.status, 200);
  const applied = await request(httpsPort, `/api/issues/${issueProjection.id}`, { headers: { cookie } });
  assert.equal(applied.status, 200);
  assert.equal(applied.value.title, "Container command applied");
  const page = await request(httpsPort, "/web");
  assert.equal(page.status, 200);
  assert.match(page.value, /data-better-codex-remote="true"/);
  assert.match(String(page.headers["strict-transport-security"]), /max-age=31536000/);
  process.stdout.write(JSON.stringify({ ok: true, transport: "https", reverse_proxy: "caddy", login: "password-cookie", sync: "round-trip", remote_command: "acknowledged" }) + "\n");
} catch (error) {
  try { process.stderr.write(composeOutput(["logs", "--no-color"], environment) + "\n"); } catch (logsError) { process.stderr.write(String(logsError) + "\n"); }
  throw error;
} finally {
  try { compose(["down", "-v", "--remove-orphans"], environment, true); } catch {}
  rmSync(directory, { recursive: true, force: true });
}
