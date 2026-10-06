import { QueryClient } from "@tanstack/react-query";
import { expect, test } from "vitest";
import { ApiRequestError, applicationKeys } from "../../lib/api";
import { offlineQuerySnapshot } from "./offline-query-cache";

test("snapshots only the selected owner's application data, never credentials or mutations", () => {
  const client = new QueryClient();
  client.setQueryData(applicationKeys.list(1, "active"), { data: { applications: [] } });
  client.setQueryData(applicationKeys.list(2, "active"), { data: { applications: [] } });
  client.setQueryData(["auth", "me"], { data: { user: { id: 1, email: "private@example.com" } } });
  client.setQueryData(["auth", "csrf"], { data: { csrfToken: "secret" } });
  const state = offlineQuerySnapshot(client, 1);
  expect(state.queries.map((query) => query.queryKey)).toEqual([applicationKeys.list(1, "active")]);
  expect(state.mutations).toEqual([]);
  expect(JSON.stringify(state)).not.toContain("secret");
  client.clear();
});

test.each([401, 403, 404, 500, 503, "transport"] as const)(
  "preserves last successful data only for recoverable refresh failures: %s",
  async (failure) => {
    const client = new QueryClient();
    const key = applicationKeys.list(1, "active");
    const data = { data: { applications: [] } };
    client.setQueryData(key, data);
    const error =
      typeof failure === "number" ? new ApiRequestError("Failed", "FAILED", failure) : new TypeError("Failed to fetch");
    try {
      await expect(
        client.fetchQuery({ queryKey: key, retry: false, queryFn: () => Promise.reject(error) }),
      ).rejects.toBe(error);
      const snapshot = offlineQuerySnapshot(client, 1);
      if (typeof failure === "number" && failure < 500) {
        expect(snapshot.queries).toEqual([]);
      } else {
        expect(snapshot.queries).toHaveLength(1);
        expect(snapshot.queries[0].state).toMatchObject({ data, status: "success", error: null, fetchStatus: "idle" });
      }
    } finally {
      client.clear();
    }
  },
);
