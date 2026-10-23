import type { DehydratedState } from "@tanstack/react-query";
import { loadOfflineSnapshot, restoreOfflineAccount } from "./offline-store";
import type { OfflineAccountMetadata } from "./offline-types";

export type OfflineRestoration = { account: OfflineAccountMetadata; snapshot: DehydratedState };

/** Recheck the durable generation after reading the snapshot across separate transactions. */
export async function restoreOfflineData(): Promise<OfflineRestoration | null> {
  const account = await restoreOfflineAccount();
  if (!account) {
    return null;
  }
  const snapshot = await loadOfflineSnapshot(account.userId);
  const current = await restoreOfflineAccount();
  const sameDownload = current?.userId === account.userId && current?.preparationId === account.preparationId;
  if (!snapshot || !sameDownload || account.expiresAt <= Date.now()) {
    return null;
  }
  return { account, snapshot };
}
