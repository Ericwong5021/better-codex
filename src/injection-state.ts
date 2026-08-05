import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { ensureDirectories, injectionStatePath } from "./config.js";

export function injectionEnabled() {
  try {
    return JSON.parse(readFileSync(injectionStatePath, "utf8")).enabled !== false;
  } catch {
    return true;
  }
}

export function setInjectionEnabled(enabled: boolean) {
  ensureDirectories();
  const temporary = `${injectionStatePath}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify({ enabled }), { mode: 0o600 });
  renameSync(temporary, injectionStatePath);
  return enabled;
}
