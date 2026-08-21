import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import https from "node:https";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";

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

async function waitForRelay(portValue) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await request(portValue, "/healthz");
      if (response.status === 200 && response.value?.ok === true && response.value?.name === "Better Codex Relay") return;
    } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 500));
  }
  throw new Error("deployment_health_timeout");
}

function socketMessage(socket) {
  return new Promise((resolveMessage, reject) => {
    const timer = setTimeout(() => reject(new Error("relay_message_timeout")), 5000);
    socket.once("message", data => {
      clearTimeout(timer);
      resolveMessage(JSON.parse(data.toString()));
    });
  });
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
  await waitForRelay(httpsPort);
  const baseOrigin = `https://localhost:${httpsPort}`;
  const adminHeaders = { authorization: `Bearer ${bootstrapSecret}` };
  const pairing = await request(httpsPort, "/api/v1/admin/pairing-codes", { method: "POST", headers: adminHeaders, body: {} });
  assert.equal(pairing.status, 201);
  const device = await request(httpsPort, "/api/v1/devices/pair", { method: "POST", body: { name: "Deployment acceptance", pairing_code: pairing.value.pairing_code } });
  assert.equal(device.status, 201);
  const socket = new WebSocket(`wss://localhost:${httpsPort}/api/v1/runtime/connect`, "better-codex-relay-v1", { rejectUnauthorized: false, headers: { authorization: `Bearer ${device.value.device_token}` } });
  await new Promise((resolveOpen, reject) => {
    socket.once("open", resolveOpen);
    socket.once("error", reject);
  });
  socket.send(JSON.stringify({ type: "hello", protocol_version: "relay/v1", device_id: device.value.device_id, runtime_instance_id: "deployment-runtime", core_version: "acceptance", capabilities: ["http-stream", "sse", "file-upload", "request-cancel"] }));
  const hello = await socketMessage(socket);
  assert.equal(hello.type, "hello_ack");

  const login = await request(httpsPort, "/relay/session", { method: "POST", headers: { origin: baseOrigin }, body: { username: webUsername, password: webPassword } });
  assert.equal(login.status, 200);
  assert.equal(Object.hasOwn(login.value, "token"), false);
  const cookie = String(login.headers["set-cookie"]?.[0] || "").split(";", 1)[0];
  assert.ok(cookie.startsWith("better_codex_relay_session="));
  const browserHeaders = { cookie, origin: baseOrigin, "x-csrf-token": login.value.csrf_token };
  const status = await request(httpsPort, "/relay/status", { headers: { cookie } });
  assert.equal(status.status, 200);
  assert.equal(status.value.runtime.online, true);
  const page = await request(httpsPort, "/web");
  assert.equal(page.status, 200);
  assert.match(page.value, /data-better-codex-host="relay"/);
  assert.match(String(page.headers["strict-transport-security"]), /max-age=31536000/);
  const tableOutput = composeOutput(["exec", "-T", "hub", "node", "--input-type=module", "-e", "import { DatabaseSync } from 'node:sqlite'; const db=new DatabaseSync('/data/better-codex-relay.db',{readOnly:true}); process.stdout.write(JSON.stringify(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\").all().map(row=>row.name))); db.close();"], environment);
  assert.deepEqual(JSON.parse(tableOutput), ["relay_audit", "relay_commands", "relay_devices", "relay_settings", "relay_web_sessions", "sqlite_sequence"]);
  const logout = await request(httpsPort, "/relay/logout", { method: "DELETE", headers: browserHeaders });
  assert.equal(logout.status, 200);
  socket.close();
  process.stdout.write(JSON.stringify({ ok: true, transport: "wss", reverse_proxy: "caddy", login: "password-cookie", authority: "runtime", relay_business_tables: 0 }) + "\n");
} catch (error) {
  try { process.stderr.write(composeOutput(["logs", "--no-color"], environment) + "\n"); } catch (logsError) { process.stderr.write(String(logsError) + "\n"); }
  throw error;
} finally {
  try { compose(["down", "-v", "--remove-orphans"], environment, true); } catch {}
  rmSync(directory, { recursive: true, force: true });
}
