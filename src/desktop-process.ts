/** Process identity checks are shared by watcher management and legacy migration. */
export type DesktopBridgeProcess = { pid: number; processStartedAt: number; profile: string; home: string; command: string; instanceId: string };

export function desktopBridgeIdentityMatches(record: DesktopBridgeProcess | null, observed: { pid: number; startedAt: number | null; command: string; profile: string; home: string }) {
  return Boolean(record && Number.isInteger(record.pid) && record.pid > 0 && record.instanceId && record.pid === observed.pid
    && record.processStartedAt === observed.startedAt && record.command === observed.command
    && record.profile === observed.profile && record.home === observed.home && /\bwatch-desktop-bridge\b/.test(record.command));
}

export function legacyInjectorIdentityMatches(observed: { command: string; executable: string; startedAt: number | null; pidFileWrittenAt: number; recordedProfile?: string; profile: string; observedHome: string | null; home: string }) {
  return /\bwatch-inject\b/.test(observed.command) && Boolean(observed.executable && observed.command.includes(observed.executable))
    && observed.recordedProfile === observed.profile && observed.observedHome === observed.home && observed.startedAt !== null
    && observed.pidFileWrittenAt >= observed.startedAt && observed.pidFileWrittenAt - observed.startedAt < 5000;
}
