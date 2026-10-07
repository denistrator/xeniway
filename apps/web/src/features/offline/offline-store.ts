import type { DehydratedState } from "@tanstack/react-query";
import { registerInputSchema } from "@xeniway/shared";
import { type DBSchema, type IDBPTransaction, openDB } from "idb";
import {
  deriveOfflineSnapshot,
  hasPreparedLists,
  hasPreparedWorkspaces,
  hasShape,
  isRecord,
  isTimestamp,
  validateStoredSnapshot,
} from "./offline-snapshot-validation";
import { OFFLINE_RETENTION_MS, type OfflineAccountMetadata, type OfflineAccountRecord } from "./offline-types";

interface OfflineDatabase extends DBSchema {
  accounts: { key: string; value: unknown };
  snapshots: { key: number; value: unknown };
}
type Transaction = IDBPTransaction<OfflineDatabase, ["accounts", "snapshots"], "readwrite">;
const accountShape = {
  version: (value: unknown) => value === 1,
  userId: (value: unknown): value is number => isTimestamp(value) && value > 0,
  email: (value: unknown): value is string => registerInputSchema.shape.email.safeParse(value).success,
  verifiedAt: isTimestamp,
  expiresAt: isTimestamp,
};
const accountMetadataShape = {
  ...accountShape,
  ready: (value: unknown): value is boolean => typeof value === "boolean",
  buildId: (value: unknown): value is string | null =>
    value === null || (typeof value === "string" && value.trim().length > 0),
};
const snapshotRecordShape = {
  version: (value: unknown) => value === 1,
  userId: isTimestamp,
  savedAt: isTimestamp,
  snapshot: isRecord,
};
function validAccount(value: unknown, now: number, metadata: false): value is OfflineAccountRecord;
function validAccount(value: unknown, now: number, metadata: true): value is OfflineAccountMetadata;
function validAccount(value: unknown, now: number, metadata: boolean): value is OfflineAccountRecord {
  if (!isTimestamp(now)) {
    return false;
  }
  if (metadata) {
    if (
      !hasShape(value, accountMetadataShape) ||
      (value.ready ? typeof value.buildId !== "string" : value.buildId !== null)
    ) {
      return false;
    }
  } else if (!hasShape(value, accountShape)) {
    return false;
  }
  return (
    value.verifiedAt <= now && value.expiresAt > now && value.expiresAt - value.verifiedAt === OFFLINE_RETENTION_MS
  );
}

/** Every operation owns its connection. No cached rejected open or test-only reset API. */
async function transact<T>(action: (tx: Transaction) => Promise<T>): Promise<T> {
  const db = await openDB<OfflineDatabase>("xeniway-offline", 1, {
    upgrade(database) {
      database.createObjectStore("accounts");
      database.createObjectStore("snapshots");
    },
    blocking() {
      db.close();
    },
  });
  try {
    const tx = db.transaction(["accounts", "snapshots"], "readwrite");
    // Observe completion immediately, including aborts triggered by thrown request errors.
    const completion = tx.done;
    void completion.catch(() => {});
    try {
      const result = await action(tx);
      await completion;
      return result;
    } catch (error) {
      try {
        tx.abort();
      } catch {
        /* A failed request may already have aborted the transaction. */
      }
      await completion.catch(() => {});
      throw error;
    }
  } finally {
    db.close();
  }
}
async function activeAccount(tx: Transaction, now?: number): Promise<OfflineAccountMetadata | null> {
  const value = await tx.objectStore("accounts").get("active");
  if (validAccount(value, now ?? Date.now(), true)) {
    return value;
  }
  // Corrupt identities cannot safely select an owner; remove all private records.
  await tx.objectStore("accounts").clear();
  await tx.objectStore("snapshots").clear();
  return null;
}
function requireOwner(
  account: OfflineAccountMetadata | null,
  userId: number,
): asserts account is OfflineAccountMetadata {
  if (!account || account.userId !== userId) {
    throw new Error("Offline account is disabled, expired or superseded");
  }
}
export class OfflinePreparationChangedError extends Error {
  constructor() {
    super("Offline preparation was superseded or removed");
  }
}
async function requirePreparation(tx: Transaction, preparationId?: string | null): Promise<void> {
  if (
    preparationId !== undefined &&
    ((await tx.objectStore("accounts").get("preparation")) ?? null) !== preparationId
  ) {
    throw new OfflinePreparationChangedError();
  }
}
async function readSnapshot(
  tx: Transaction,
  account: OfflineAccountMetadata,
  now?: number,
): Promise<DehydratedState | null> {
  const value = await tx.objectStore("snapshots").get(account.userId);
  // A queued writer may save after the reader starts opening its connection.
  const readAt = now ?? Date.now();
  if (
    hasShape(value, snapshotRecordShape) &&
    value.userId === account.userId &&
    value.savedAt >= account.verifiedAt &&
    value.savedAt <= readAt
  ) {
    const snapshot = validateStoredSnapshot(account.userId, value.snapshot, value.savedAt);
    if (snapshot) {
      return snapshot;
    }
  }
  await tx.objectStore("snapshots").delete(account.userId);
  if (account.ready) {
    await tx.objectStore("accounts").put({ ...account, ready: false, buildId: null }, "active");
  }
  return null;
}

export async function enableOfflineAccount(record: OfflineAccountRecord): Promise<string> {
  if (!validAccount(record, Date.now(), false)) {
    throw new Error("Invalid offline account record");
  }
  // A fresh opt-in always starts preparation again, including for the same account.
  const preparationId = crypto.randomUUID();
  await transact(async (tx) => {
    await tx.objectStore("accounts").clear();
    await tx.objectStore("snapshots").clear();
    await tx.objectStore("accounts").put({ ...record, ready: false, buildId: null }, "active");
    await tx.objectStore("accounts").put(preparationId, "preparation");
  });
  return preparationId;
}
export async function assertOfflinePreparation(userId: number, preparationId: string): Promise<void> {
  await transact(async (tx) => {
    requireOwner(await activeAccount(tx, Date.now()), userId);
    await requirePreparation(tx, preparationId);
  });
}
export async function restoreOfflineAccount(now?: number): Promise<OfflineAccountMetadata | null> {
  return transact(async (tx) => {
    const account = await activeAccount(tx, now);
    if (!account?.ready) {
      return null;
    }
    const snapshot = await readSnapshot(tx, account, now);
    if (!snapshot || !hasPreparedLists(snapshot)) {
      return null;
    }
    const preparationId = await tx.objectStore("accounts").get("preparation");
    return typeof preparationId === "string" ? { ...account, preparationId } : account;
  });
}
export async function saveOfflineSnapshot(
  userId: number,
  snapshot: DehydratedState,
  preparationId?: string | null,
): Promise<void> {
  await transact(async (tx) => {
    await requirePreparation(tx, preparationId);
    const now = Date.now();
    const account = await activeAccount(tx, now);
    requireOwner(account, userId);
    const filtered = deriveOfflineSnapshot(userId, snapshot, now);
    await tx.objectStore("snapshots").put({ version: 1, userId, savedAt: now, snapshot: filtered }, userId);
    if (account.ready && !hasPreparedLists(filtered)) {
      await tx.objectStore("accounts").put({ ...account, ready: false, buildId: null }, "active");
    }
  });
}
export async function loadOfflineSnapshot(userId: number, now?: number): Promise<DehydratedState | null> {
  return transact(async (tx) => {
    const account = await activeAccount(tx, now);
    if (!account?.ready || account.userId !== userId) {
      return null;
    }
    const snapshot = await readSnapshot(tx, account, now);
    return snapshot && hasPreparedLists(snapshot) ? snapshot : null;
  });
}
export async function clearOfflineAccount(userId: number, preparationId?: string | null): Promise<boolean> {
  return transact(async (tx) => {
    if (
      preparationId !== undefined &&
      ((await tx.objectStore("accounts").get("preparation")) ?? null) !== preparationId
    ) {
      return false;
    }
    const account = await activeAccount(tx, Date.now());
    // Old tabs may clear their own owner key but cannot clear the new active identity.
    await tx.objectStore("snapshots").delete(userId);
    if (account?.userId === userId) {
      await tx.objectStore("accounts").delete("active");
      await tx.objectStore("accounts").delete("preparation");
    }
    return true;
  });
}

/** Explicit profile-wide logout also clears opt-ins made by another tab. */
export async function clearOfflineDevice(): Promise<void> {
  await transact(async (tx) => {
    await tx.objectStore("accounts").clear();
    await tx.objectStore("snapshots").clear();
  });
}
export async function markOfflineReady(
  userId: number,
  buildId: string,
  preparationId?: string,
): Promise<OfflineAccountMetadata> {
  if (typeof buildId !== "string" || !buildId.trim()) {
    throw new Error("Offline readiness requires a build ID");
  }
  return transact(async (tx) => {
    await requirePreparation(tx, preparationId);
    const now = Date.now();
    const account = await activeAccount(tx, now);
    requireOwner(account, userId);
    const snapshot = await readSnapshot(tx, account, now);
    if (!snapshot || !hasPreparedLists(snapshot)) {
      throw new Error("Offline preparation requires all three lists");
    }
    if (preparationId !== undefined && !hasPreparedWorkspaces(snapshot)) {
      throw new Error("Offline preparation requires all workspaces");
    }
    const ready = { ...account, ready: true, buildId };
    await tx.objectStore("accounts").put(ready, "active");
    const generation = await tx.objectStore("accounts").get("preparation");
    return typeof generation === "string" ? { ...ready, preparationId: generation } : ready;
  });
}
