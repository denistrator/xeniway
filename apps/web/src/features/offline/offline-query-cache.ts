import type { QueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "../../lib/api";
import { deriveOfflineSnapshot } from "./offline-snapshot-validation";

export function offlineQuerySnapshot(client: QueryClient, userId: number) {
  const queries = [];
  for (const query of client.getQueryCache().getAll()) {
    const { queryKey, state } = query;
    if (
      queryKey[0] !== "applications" ||
      queryKey[1] !== userId ||
      state.data === undefined ||
      (state.error instanceof ApiRequestError && [401, 403, 404].includes(state.error.status))
    )
      continue;
    // A failed transport refresh retains server data, but none of its error or fetch metadata.
    queries.push({
      queryKey,
      state: {
        data: state.data,
        dataUpdatedAt: state.dataUpdatedAt,
        dataUpdateCount: state.dataUpdateCount,
        status: "success",
      },
    });
  }
  return deriveOfflineSnapshot(userId, { queries, mutations: [] }, Date.now());
}
