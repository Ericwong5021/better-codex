import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { ensureDirectories, injectionStatePath, mockupSessionPath } from "./config.js";

export function mockupSessionActive() {
  if (!existsSync(mockupSessionPath)) return false;
  try {
    const value = JSON.parse(readFileSync(mockupSessionPath, "utf8")) as { pid?: number; restore_injection?: boolean };
    if (!Number.isInteger(value.pid) || Number(value.pid) < 1) throw new Error("invalid_mockup_session");
    process.kill(Number(value.pid), 0);
    return true;
  } catch {
    let restore = false;
    try { restore = JSON.parse(readFileSync(mockupSessionPath, "utf8")).restore_injection === true; } catch {}
    try { unlinkSync(mockupSessionPath); } catch {}
    if (restore) setInjectionEnabled(true);
    return false;
  }
}

export function injectionEnabled() {
  mockupSessionActive();
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
