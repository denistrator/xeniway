import { hasShape, isTimestamp } from "./offline-snapshot-validation";

export type OfflineCleanupTarget = { ownerId: number; preparationId: string | null };

export const offlineCleanupStorageKey = "offlineDownloadCleanup";

export class OfflineCleanupPendingError extends Error {
  constructor() {
    super("Offline download cleanup must finish first");
  }
}

/** Recovery metadata only: never permission to restore a private download. */
export function readOfflineCleanup(): OfflineCleanupTarget | null {
  const raw = window.localStorage.getItem(offlineCleanupStorageKey);
  if (raw === null) {
    return null;
  }
  const value: unknown = JSON.parse(raw);
  const valid = hasShape(value, {
    ownerId: (owner: unknown): owner is number => isTimestamp(owner) && owner > 0,
    preparationId: (generation: unknown): generation is string | null =>
      generation === null || (typeof generation === "string" && generation.length > 0),
  });
  if (!valid) {
    throw new Error("Offline cleanup metadata could not be read");
  }
  return value;
}

function matchesCleanup(current: OfflineCleanupTarget, target: OfflineCleanupTarget): boolean {
  return current.ownerId === target.ownerId && current.preparationId === target.preparationId;
}

export function rememberOfflineCleanup(target: OfflineCleanupTarget): void {
  const current = readOfflineCleanup();
  if (current && !matchesCleanup(current, target)) {
    throw new Error("Another offline download is awaiting cleanup");
  }
  window.localStorage.setItem(offlineCleanupStorageKey, JSON.stringify(target));
}

export function finishOfflineCleanup(target: OfflineCleanupTarget): void {
  const current = readOfflineCleanup();
  if (current && matchesCleanup(current, target)) {
    window.localStorage.removeItem(offlineCleanupStorageKey);
  }
}

/** Only explicit device-wide logout may clear a marker without selecting its owner. */
export function clearOfflineDeviceCleanup(): void {
  window.localStorage.removeItem(offlineCleanupStorageKey);
}

export function assertOfflineCleanupComplete(): void {
  if (readOfflineCleanup()) {
    throw new OfflineCleanupPendingError();
  }
}
