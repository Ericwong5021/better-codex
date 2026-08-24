import { existsSync, statfsSync } from "node:fs";
import { dirname } from "node:path";

const gibibyte = 1024 ** 3;
const criticalReserveBytes = 2 * gibibyte;
const warningReserveBytes = 10 * gibibyte;

export function storageHealth(path: string) {
  let target = dirname(path);
  while (!existsSync(target) && dirname(target) !== target) target = dirname(target);
  const stats = statfsSync(target);
  const blockSize = Number(stats.bsize);
  const totalBytes = Number(stats.blocks) * blockSize;
  const freeBytes = Number(stats.bavail) * blockSize;
  const freeRatio = totalBytes > 0 ? freeBytes / totalBytes : 0;
  return {
    ok: freeBytes >= criticalReserveBytes,
    degraded: freeBytes < warningReserveBytes || freeRatio < 0.05,
    path: target,
    total_bytes: totalBytes,
    free_bytes: freeBytes,
    free_ratio: freeRatio,
    critical_reserve_bytes: criticalReserveBytes,
    warning_reserve_bytes: warningReserveBytes,
  };
}

export function requireStorageCapacity(path: string, operationBytes: number) {
  const storage = storageHealth(path);
  const requiredBytes = criticalReserveBytes + Math.max(0, operationBytes);
  if (storage.free_bytes < requiredBytes) {
    throw new Error(`insufficient_disk_space:free=${storage.free_bytes}:required=${requiredBytes}:path=${storage.path}`);
  }
  return storage;
}
