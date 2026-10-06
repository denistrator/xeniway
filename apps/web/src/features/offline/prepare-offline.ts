import type { QueryClient } from "@tanstack/react-query";
import {
  applicationKeys,
  getApplicationDetail,
  listApplications,
  listArchivedApplications,
  listBlacklistedApplications,
} from "../../lib/api";
import { offlineQuerySnapshot } from "./offline-query-cache";
import {
  assertOfflinePreparation,
  clearOfflineAccount,
  enableOfflineAccount,
  markOfflineReady,
  saveOfflineSnapshot,
} from "./offline-store";
import { OFFLINE_RETENTION_MS, type OfflinePreparationProgress } from "./offline-types";

export type { OfflinePreparationProgress } from "./offline-types";

const collectionRequests = [
  ["active", listApplications],
  ["archive", listArchivedApplications],
  ["blacklist", listBlacklistedApplications],
] as const;

function notifyAccountReplacement(userId: number) {
  if (typeof BroadcastChannel !== "function") return;
  const channel = new BroadcastChannel("xeniway-offline");
  channel.postMessage({ type: "account-replaced", userId });
  channel.close();
}

export async function prepareOfflineAccount(
  client: QueryClient,
  user: { id: number; email: string },
  prepareAssets: () => Promise<string>,
  assertOwner: () => void,
  onProgress?: (progress: OfflinePreparationProgress) => void,
  notifyReplacement: (userId: number) => void = notifyAccountReplacement,
) {
  assertOwner();
  const now = Date.now();
  const preparationId = await enableOfflineAccount({
    version: 1,
    userId: user.id,
    email: user.email,
    verifiedAt: now,
    expiresAt: now + OFFLINE_RETENTION_MS,
  });
  let stopped = false;
  let preparationFailure: unknown;
  const stopPreparation = (error: unknown) => {
    if (!stopped) preparationFailure = error;
    stopped = true;
  };
  const assertCurrent = async () => {
    assertOwner();
    await assertOfflinePreparation(user.id, preparationId);
    assertOwner();
    if (stopped) throw preparationFailure;
  };
  client.setQueryDefaults(applicationKeys.account(user.id), { gcTime: OFFLINE_RETENTION_MS });
  async function fetchCurrent<T>(queryKey: readonly unknown[], request: () => Promise<T>): Promise<T> {
    try {
      return await client.fetchQuery({
        queryKey,
        queryFn: async () => {
          await assertCurrent();
          const response = await request();
          await assertCurrent();
          return response;
        },
        staleTime: 0,
        gcTime: OFFLINE_RETENTION_MS,
        retry: false,
        networkMode: "always",
      });
    } catch (error) {
      stopPreparation(error);
      throw error;
    }
  }
  async function loadCollections(): Promise<number[]> {
    // A failed collection must settle its peers before private-storage cleanup.
    const results = await Promise.allSettled(
      collectionRequests.map(([collection, request]) =>
        fetchCurrent(applicationKeys.list(user.id, collection), request),
      ),
    );
    const lists = results.map((result) => {
      if (result.status === "rejected") throw result.reason;
      return result.value;
    });
    await assertCurrent();
    return [...new Set(lists.flatMap((response) => response.data.applications.map((application) => application.id)))];
  }
  async function loadWorkspaces(ids: number[]): Promise<void> {
    let nextIndex = 0;
    let completed = 0;
    onProgress?.({ completed, total: ids.length });
    const workers = await Promise.allSettled(
      Array.from({ length: Math.min(4, ids.length) }, async () => {
        try {
          while (nextIndex < ids.length) {
            await assertCurrent();
            const id = ids[nextIndex++];
            // Another worker may consume the final ID while this one checks durable ownership.
            if (id === undefined) return;
            await fetchCurrent(applicationKeys.detail(user.id, id), () => getApplicationDetail(id));
            await assertCurrent();
            completed += 1;
            onProgress?.({ completed, total: ids.length });
          }
        } catch (error) {
          stopPreparation(error);
          throw error;
        }
      }),
    );
    const failure = workers.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  }
  async function persistPreparedAccount(ids: number[], buildId: string) {
    await assertCurrent();
    const currentIds = new Set(ids);
    client.removeQueries({
      queryKey: applicationKeys.account(user.id),
      predicate: (query) =>
        query.queryKey[2] === "detail" && (typeof query.queryKey[3] !== "number" || !currentIds.has(query.queryKey[3])),
    });
    await saveOfflineSnapshot(user.id, offlineQuerySnapshot(client, user.id), preparationId);
    await assertCurrent();
    const account = await markOfflineReady(user.id, buildId, preparationId);
    await assertCurrent();
    return account;
  }
  try {
    await assertCurrent();
    notifyReplacement(user.id);
    const buildId = await prepareAssets();
    await assertCurrent();
    const ids = await loadCollections();
    await loadWorkspaces(ids);
    return await persistPreparedAccount(ids, buildId);
  } catch (error) {
    stopPreparation(error);
    await clearOfflineAccount(user.id, preparationId);
    throw error;
  }
}
