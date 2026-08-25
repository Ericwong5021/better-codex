import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { ensureDirectories, injectionStatePath, mockupSessionPath } from "./config.js";

type InjectionState = { enabled?: boolean; profile?: string; endpoint?: string };

function readInjectionState(): InjectionState {
  try {
    return JSON.parse(readFileSync(injectionStatePath, "utf8")) as InjectionState;
  } catch {
    return {};
  }
}

function writeInjectionState(state: InjectionState) {
  ensureDirectories();
  const temporary = `${injectionStatePath}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(state), { mode: 0o600 });
  renameSync(temporary, injectionStatePath);
}

function localMockupInjectionLeaseActive() {
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
  localMockupInjectionLeaseActive();
  return readInjectionState().enabled !== false;
}

export function setInjectionEnabled(enabled: boolean) {
  writeInjectionState({ ...readInjectionState(), enabled });
  return enabled;
}

export function recordInjectionOwnership(profile: string, endpoint: string) {
  writeInjectionState({ ...readInjectionState(), profile, endpoint });
}
