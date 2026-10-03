#!/usr/bin/env node
// Explicit operator action only: builds and tests never start this connection.
import { execFileSync } from "node:child_process";
import { lstatSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const allowed = ["external_observations_events", "external_observations_get", "external_observations_list", "external_tasks_report"].sort();
const executable = option("--executable") || join(homedir(), ".local", "bin", "better-codex");
const alias = "better-codex-dot";
if (args.includes("--help")) {
  console.log("node scripts/connect-dot-tunnel.mjs --check [--executable /stable/path/better-codex]\nnode scripts/connect-dot-tunnel.mjs --tunnel-id tunnel_ID --runtime-key-file /private/path/key [--executable /stable/path/better-codex]\nUses the official managed tunnel-client runtime; never creates credentials or a tunnel.");
  process.exit(0);
}
try {
  if (!isAbsolute(executable)) throw new Error("dot_tunnel_requires_absolute_stable_executable");
  const tunnelId = option("--tunnel-id"), keyFile = option("--runtime-key-file");
  if (!args.includes("--check")) {
    if (!/^tunnel_[a-zA-Z0-9]+$/.test(tunnelId || "")) throw new Error("dot_tunnel_id_required");
    if (!keyFile || !isAbsolute(keyFile)) throw new Error("dot_tunnel_private_key_file_required");
    const stat = lstatSync(keyFile);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0 || (stat.mode & 0o077)) throw new Error("dot_tunnel_key_file_must_be_private_0600");
  }
  const transport = new StdioClientTransport({ command: executable, args: ["mcp", "--dot"], stderr: "pipe" });
  const client = new Client({ name: "better-codex-dot-preflight", version: "1.0.0" });
  let version;
  try {
    await client.connect(transport, { timeout: 15_000 });
    const names = (await client.listTools({}, { timeout: 15_000 })).tools.map(tool => tool.name).sort();
    if (JSON.stringify(names) !== JSON.stringify(allowed) || client.getServerCapabilities()?.resources) throw new Error("dot_tunnel_tool_surface_mismatch");
    const read = await client.callTool({ name: "external_observations_list", arguments: {} });
    const capability = read.structuredContent?.capability;
    if (read.isError || !capability?.enabled || !capability?.connected) throw new Error("dot_tunnel_runtime_reporting_not_ready");
    version = client.getServerVersion()?.version;
  } finally { await client.close(); }
  if (args.includes("--check")) {
    console.log(JSON.stringify({ preflight: "passed", version, tools: allowed, tunnelStarted: false }));
    process.exit(0);
  }
  // Quote for tunnel-client's command parser, never a shell. Only the stable
  // launcher is referenced; target cores can change through normal updates.
  const mcpCommand = `"${executable.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}" mcp --dot`;
  execFileSync("tunnel-client", ["runtimes", "connect", "--alias", alias, "--profile", alias,
    "--tunnel-id", tunnelId, "--mcp-command", mcpCommand, "--runtime-api-key", `file:${keyFile}`, "--json"],
    { stdio: ["ignore", "ignore", "pipe"], timeout: 60_000 });
  const status = JSON.parse(execFileSync("tunnel-client", ["runtimes", "status", alias, "--json"], { encoding: "utf8", timeout: 15_000 }));
  console.log(JSON.stringify({ preflight: "passed", version, alias, status }));
  // Managed process health is separate from a real Dot tool invocation.
} catch (error) {
  // Never echo process stderr, command arguments, or credential contents.
  const code = error instanceof Error && error.message.startsWith("dot_tunnel_") ? error.message : "dot_tunnel_setup_failed";
  console.error(JSON.stringify({ error: code, alias, action: "Check the installed --dot entry, Runtime readiness, tunnel permissions and the private runtime key file." }));
  process.exitCode = 1;
}
