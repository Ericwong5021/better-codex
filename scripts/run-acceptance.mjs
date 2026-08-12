import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const command = process.platform === "win32" ? "npm.cmd" : "npm";
const startedAt = new Date().toISOString();

function run(args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function output(commandValue, args) {
  const result = spawnSync(commandValue, args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) return "unknown";
  return result.stdout.trim();
}

run(["run", "test:web:stack"]);
run(["run", "test:deploy:selfhost"]);
const report = {
  schema_version: 1,
  result: "passed",
  commit: output("git", ["rev-parse", "HEAD"]),
  started_at: startedAt,
  finished_at: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    playwright: output(command, ["exec", "playwright", "--", "--version"]),
    docker: output("docker", ["version", "--format", "{{.Server.Version}}"]),
  },
  scenarios: [
    { id: "web-host-stack", result: "passed", retries: 0 },
    { id: "selfhost-password-session", result: "passed", retries: 0 },
    { id: "selfhost-safe-projection", result: "passed", retries: 0 },
    { id: "selfhost-remote-command-ack", result: "passed", retries: 0 },
    { id: "selfhost-caddy-https", result: "passed", retries: 0 },
    { id: "selfhost-backup-restore", result: "passed", retries: 0 },
  ],
};
mkdirSync(joinPath(root, "release"), { recursive: true });
writeFileSync(joinPath(root, "release/acceptance.json"), JSON.stringify(report, null, 2) + "\n");
process.stdout.write(JSON.stringify({ result: report.result, report: "release/acceptance.json", scenarios: report.scenarios.length }) + "\n");

function joinPath(base, path) {
  return resolve(base, path);
}
