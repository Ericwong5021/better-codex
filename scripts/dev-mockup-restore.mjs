import { spawnSync } from "node:child_process";
import { join } from "node:path";

const parentPid = Number(process.argv[2]);
const root = process.argv[3];
const productionHome = process.argv[4];
const mockupHome = process.argv[5];
const cdpPort = process.argv[6];
const childPids = process.argv.slice(7).map(Number).filter(pid => Number.isInteger(pid) && pid > 0);
const executable = join(root, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function terminateChildren() {
  childPids.forEach(pid => {
    try { process.kill(pid, "SIGTERM"); } catch {}
  });
  const deadline = Date.now() + 5000;
  while (childPids.some(alive) && Date.now() < deadline) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
  childPids.filter(alive).forEach(pid => {
    try { process.kill(pid, "SIGKILL"); } catch {}
  });
}

const timer = setInterval(() => {
  try {
    process.kill(parentPid, 0);
  } catch {
    clearInterval(timer);
    terminateChildren();
    spawnSync(executable, ["src/cli.ts", "eject", "--port", cdpPort], { cwd: root, env: { ...process.env, BETTER_CODEX_HOME: mockupHome }, stdio: "ignore" });
    spawnSync(executable, ["src/cli.ts", "inject"], { cwd: root, env: { ...process.env, BETTER_CODEX_HOME: productionHome }, stdio: "ignore" });
    process.exit(0);
  }
}, 250);
