import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { mcpReportingEnabled, readMcpReportingSetting, writeMcpReportingSetting } from "../src/mcp-reporting.js";

test("reporting settings persist privately, fail closed and respect explicit environment overrides", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-reporting-"));
  const path = join(home, "mcp-reporting.json");
  try {
    assert.equal(mcpReportingEnabled(path, {}), false);
    writeMcpReportingSetting(true, path);
    assert.equal(readMcpReportingSetting(path), true);
    assert.equal(mcpReportingEnabled(path, {}), true);
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(mcpReportingEnabled(path, { BETTER_CODEX_MCP_ALLOW_REPORTS: "0" }), false);
    assert.equal(mcpReportingEnabled(path, { BETTER_CODEX_MCP_ALLOW_REPORTS: "invalid" }), false);
    writeMcpReportingSetting(false, path);
    assert.equal(JSON.parse(readFileSync(path, "utf8")).enabled, false);
    assert.equal(mcpReportingEnabled(path, { BETTER_CODEX_MCP_ALLOW_REPORTS: "1" }), true);
    for (const contents of ['{', '{"schema_version":2,"enabled":true}', '{"schema_version":1,"enabled":"true"}']) {
      writeFileSync(path, contents);
      assert.equal(mcpReportingEnabled(path, {}), false);
    }
  } finally { rmSync(home, { recursive: true, force: true }); }
});


test("service configuration keeps report opt-in across fresh processes", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-reporting-service-"));
  try {
    const program = `import {servicePlist} from './src/service.ts'; console.log(servicePlist());`;
    const environment = { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_BASE_ENTRYPOINT: join(home, "better-codex.cjs"), BETTER_CODEX_MCP_ALLOW_REPORTS: undefined };
    writeFileSync(environment.BETTER_CODEX_BASE_ENTRYPOINT, "");
    const render = () => execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", program], { cwd: process.cwd(), env: environment, encoding: "utf8" });
    assert.doesNotMatch(render(), /BETTER_CODEX_MCP_ALLOW_REPORTS/);
    writeMcpReportingSetting(true, join(home, "mcp-reporting.json"));
    assert.match(render(), /<key>BETTER_CODEX_MCP_ALLOW_REPORTS<\/key><string>1<\/string>/);
    writeMcpReportingSetting(false, join(home, "mcp-reporting.json"));
    assert.doesNotMatch(render(), /BETTER_CODEX_MCP_ALLOW_REPORTS/);
  } finally { rmSync(home, { recursive: true, force: true }); }
});
