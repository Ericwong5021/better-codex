import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const installerPath = new URL("../scripts/install.ps1", import.meta.url);
const source = readFileSync(installerPath, "utf8");

test("Windows installer captures native stderr without turning progress into a terminating error", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1" : false,
}, () => {
  const script = String.raw`
$source = Get-Content -Raw -LiteralPath $env:BETTER_CODEX_INSTALLER_TEST_PATH
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
$function = $ast.Find({
  param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq "Invoke-NativeCapture"
}, $true)
if (-not $function) { throw "Invoke-NativeCapture is missing" }
Invoke-Expression $function.Extent.Text

$ErrorActionPreference = "Stop"
$success = Invoke-NativeCapture $env:ComSpec @("/d", "/c", "echo installing_runtime 1>&2 & exit /b 0")
$failure = Invoke-NativeCapture $env:ComSpec @("/d", "/c", "echo actual_failure 1>&2 & exit /b 7")

if ($success.ExitCode -ne 0) { throw "success exit code was $($success.ExitCode)" }
if ($success.Output -notmatch "installing_runtime") { throw "success stderr was not captured" }
if ($failure.ExitCode -ne 7) { throw "failure exit code was $($failure.ExitCode)" }
if ($failure.Output -notmatch "actual_failure") { throw "failure stderr was not captured" }
if ($ErrorActionPreference -ne "Stop") { throw "ErrorActionPreference was not restored" }
`;

  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    env: { ...process.env, BETTER_CODEX_INSTALLER_TEST_PATH: installerPath.pathname.replace(/^\/(.:)/, "$1") },
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("all installer commands that merge native stderr use the compatibility wrapper", () => {
  assert.match(source, /function Invoke-NativeCapture/);
  assert.deepEqual(
    source.split(/\r?\n/).filter((line) => line.includes("2>&1")).map((line) => line.trim()),
    ["$output = (& $Executable @Arguments 2>&1 | Out-String)"],
  );
  assert.match(source, /Invoke-NativeCapture \$executable @\("setup", "--yes"\)/);
});
