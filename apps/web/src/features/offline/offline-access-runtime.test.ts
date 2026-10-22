import "fake-indexeddb/auto";
import { defaultScheduler, notifyManager, QueryClient } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import { applicationKeys, assertAuthenticatedWrite } from "../../lib/api";
import { createOfflineAccessRuntime, type OfflineRestoration, offlineAuthKey } from "./offline-access-runtime";
import { offlineQuerySnapshot } from "./offline-query-cache";
import {
  clearOfflineDevice,
  enableOfflineAccount,
  markOfflineReady,
  restoreOfflineAccount,
  saveOfflineSnapshot,
} from "./offline-store";
import { OFFLINE_RETENTION_MS } from "./offline-types";

afterEach(async () => {
  notifyManager.setScheduler(defaultScheduler);
  await clearOfflineDevice();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const user = { id: 1, email: "candidate@example.com" };
const otherUser = { id: 2, email: "other@example.com" };

function controlNotifications() {
  const scheduled: Array<() => void> = [];
  notifyManager.setScheduler((callback) => scheduled.push(callback));
  return () => {
    // Drain callbacks scheduled by callbacks too, without advancing network work.
    let count = 0;
    while (scheduled.length) {
      if (++count > 1000) {
        throw new Error("Query notifications did not settle");
      }
      scheduled.shift()?.();
    }
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function sessionResponse() {
  return new Response(JSON.stringify({ data: { user } }));
}

function errorResponse(status: number) {
  return new Response(JSON.stringify({ error: { code: "REQUEST_FAILED", message: "Request failed" } }), { status });
}
function setup() {
  vi.stubGlobal("BroadcastChannel", undefined);
  const client = new QueryClient();
  client.setQueryData(["auth", "me"], { data: { user: { id: 1, email: "candidate@example.com" } } });
  const runtime = createOfflineAccessRuntime(client);
  const stop = runtime.start();
  return {
    client,
    runtime,
    stop,
    cleanup: () => {
      stop();
      client.clear();
    },
  };
}
test("connection loss revokes the request guard before subscribers render", () => {
  const { runtime, cleanup } = setup();
  try {
    expect(assertAuthenticatedWrite).not.toThrow();
    window.dispatchEvent(new Event("offline"));
    expect(runtime.getSnapshot().canMutate).toBe(false);
    expect(assertAuthenticatedWrite).toThrow();
  } finally {
    cleanup();
  }
});

test("failed download cleanup remains retryable without restoring device access", async () => {
  const client = new QueryClient();
  client.setQueryData(offlineAuthKey, { data: { user } });
  const account = {
    version: 1 as const,
    userId: user.id,
    email: user.email,
    verifiedAt: Date.now(),
    expiresAt: Date.now() + OFFLINE_RETENTION_MS,
    ready: true,
    buildId: "runtime-test",
  };
  const runtime = createOfflineAccessRuntime(client, { initialAccount: account });
  const stop = runtime.start();
  const originalIndexedDb = indexedDB;
  try {
    vi.stubGlobal("indexedDB", {
      open() {
        throw new DOMException("Denied", "SecurityError");
      },
    });

    await expect(runtime.removeDownload()).rejects.toThrow("Denied");
    window.dispatchEvent(new Event("offline"));
    expect(runtime.getSnapshot()).toMatchObject({ account: null, readAccountId: null, cleanup: { status: "failed" } });

    vi.stubGlobal("indexedDB", originalIndexedDb);
    await runtime.retryDownloadCleanup();

    expect(runtime.getSnapshot()).toMatchObject({ account: null, readAccountId: null, cleanup: { status: "idle" } });
  } finally {
    vi.stubGlobal("indexedDB", originalIndexedDb);
    stop();
    client.clear();
  }
});
test("disposed subscriptions cannot react and the same runtime can restart", () => {
  const { runtime, cleanup } = setup();
  cleanup();
  window.dispatchEvent(new Event("offline"));
  expect(runtime.getSnapshot().canMutate).toBe(true);
  const stop = runtime.start();
  window.dispatchEvent(new Event("offline"));
  expect(runtime.getSnapshot().canMutate).toBe(false);
  stop();
});

test("a queued auth success cannot reopen access after a private API outage", () => {
  const flush = controlNotifications();
  const { client, runtime, cleanup } = setup();
  try {
    flush();
    client.setQueryData(offlineAuthKey, { data: { user: { ...user, email: "updated@example.com" } } });
    window.dispatchEvent(new Event("xeniway:server-unavailable"));
    expect(runtime.getSnapshot().canMutate).toBe(false);
    expect(assertAuthenticatedWrite).toThrow();

    flush();

    expect(runtime.getSnapshot()).toMatchObject({ readAccountId: 1, canMutate: false, canReadRemote: false });
    expect(assertAuthenticatedWrite).toThrow();
  } finally {
    cleanup();
  }
});

test("a success queued before Retry cannot complete its pending verification", async () => {
  const flush = controlNotifications();
  const response = deferred<Response>();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => response.promise),
  );
  const { client, runtime, cleanup } = setup();
  let retry: Promise<void> | undefined;
  try {
    flush();
    client.setQueryData(offlineAuthKey, { data: { user: { ...user, email: "updated@example.com" } } });
    window.dispatchEvent(new Event("xeniway:server-unavailable"));
    retry = runtime.retryConnection();
    expect(client.getQueryState(offlineAuthKey)?.fetchStatus).toBe("fetching");

    flush();

    expect.soft(runtime.getSnapshot()).toMatchObject({ canMutate: false, canReadRemote: false, checking: true });
    expect.soft(assertAuthenticatedWrite).toThrow();
    response.resolve(sessionResponse());
    await retry;
    flush();
    expect(runtime.getSnapshot().canMutate).toBe(true);
    expect(assertAuthenticatedWrite).not.toThrow();
  } finally {
    response.resolve(sessionResponse());
    await retry;
    cleanup();
  }
});

test("a queued 401 observation cannot erase a newer successful sign-in", async () => {
  const flush = controlNotifications();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => errorResponse(401)),
  );
  const { client, runtime, cleanup } = setup();
  try {
    flush();
    await client.refetchQueries({ queryKey: offlineAuthKey, exact: true });
    // Sign-in writes its response before scheduled notifications are drained.
    client.setQueryData(offlineAuthKey, { data: { user: otherUser } });

    flush();

    expect(client.getQueryData(offlineAuthKey)).toEqual({ data: { user: otherUser } });
    expect(runtime.getSnapshot()).toMatchObject({ readAccountId: 2, canMutate: true, canReadRemote: true });
    expect(assertAuthenticatedWrite).not.toThrow();
  } finally {
    cleanup();
  }
});

test("repeated Retry with a prior auth error waits for the newest verification", async () => {
  const flush = controlNotifications();
  const supersededResponse = deferred<Response>();
  const currentResponse = deferred<Response>();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(errorResponse(500))
    .mockImplementationOnce(() => supersededResponse.promise)
    .mockImplementationOnce(() => currentResponse.promise);
  vi.stubGlobal("fetch", fetchMock);
  const { runtime, cleanup } = setup();
  let supersededRetry: Promise<void> | undefined;
  let currentRetry: Promise<void> | undefined;
  try {
    flush();
    await runtime.retryConnection();
    flush();
    expect(runtime.getSnapshot().canMutate).toBe(false);

    supersededRetry = runtime.retryConnection();
    flush();
    expect(runtime.getSnapshot()).toMatchObject({ canMutate: false, checking: true });
    currentRetry = runtime.retryConnection();
    flush();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(runtime.getSnapshot()).toMatchObject({ canMutate: false, checking: true });

    supersededResponse.resolve(sessionResponse());
    await supersededResponse.promise;
    flush();
    expect(runtime.getSnapshot()).toMatchObject({ canMutate: false, canReadRemote: false, checking: true });
    expect(assertAuthenticatedWrite).toThrow();

    currentResponse.resolve(sessionResponse());
    await currentRetry;
    await supersededRetry;
    flush();
    expect(runtime.getSnapshot()).toMatchObject({ canMutate: true, canReadRemote: true, checking: false });
    expect(assertAuthenticatedWrite).not.toThrow();
  } finally {
    supersededResponse.resolve(sessionResponse());
    currentResponse.resolve(sessionResponse());
    await supersededRetry;
    await currentRetry;
    cleanup();
  }
});

test.each(["transport", "server"] as const)(
  "a background /me %s failure revokes selector permissions as well as the write guard",
  async (failure) => {
    const flush = controlNotifications();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        if (failure === "transport") {
          throw new TypeError("Network unavailable");
        }
        return errorResponse(500);
      }),
    );
    const { client, runtime, cleanup } = setup();
    try {
      flush();
      await client.refetchQueries({ queryKey: offlineAuthKey, exact: true });
      flush();

      expect(assertAuthenticatedWrite).toThrow();
      expect(runtime.getSnapshot()).toMatchObject({ readAccountId: 1, canMutate: false, canReadRemote: false });
    } finally {
      cleanup();
    }
  },
);

test.each(["before mount", "during restoration"])(
  "owner switch %s clears the captured durable download before an offline reload",
  async (timing) => {
    const flush = controlNotifications();
    vi.stubGlobal("BroadcastChannel", undefined);
    const source = new QueryClient();
    const client = new QueryClient();
    const restoration = deferred<OfflineRestoration | null>();
    let stop: (() => void) | undefined;
    try {
      const now = Date.now();
      const generation = await enableOfflineAccount({
        version: 1,
        userId: user.id,
        email: user.email,
        verifiedAt: now,
        expiresAt: now + OFFLINE_RETENTION_MS,
      });
      for (const list of ["active", "archive", "blacklist"] as const) {
        source.setQueryData(applicationKeys.list(user.id, list), { data: { applications: [] } });
      }
      const snapshot = offlineQuerySnapshot(source, user.id);
      await saveOfflineSnapshot(user.id, snapshot, generation);
      await markOfflineReady(user.id, "runtime-test", generation);
      const account = await restoreOfflineAccount();
      if (!account) {
        throw new Error("Missing ready fixture download");
      }

      client.setQueryData(offlineAuthKey, { data: { user: timing === "before mount" ? otherUser : user } });
      const runtime = createOfflineAccessRuntime(client, { restoration: restoration.promise });
      stop = runtime.start();
      flush();
      if (timing === "during restoration") {
        client.setQueryData(offlineAuthKey, { data: { user: otherUser } });
      }
      restoration.resolve({ account, snapshot });
      await restoration.promise;
      flush();
      expect(runtime.getSnapshot()).toMatchObject({ account: null, readAccountId: otherUser.id, checking: false });
      expect(client.getQueryData(applicationKeys.list(user.id, "active"))).toBeUndefined();

      // A fresh offline mount reads IndexedDB without the previous auth cache.
      await vi.waitFor(async () => expect(await restoreOfflineAccount()).toBeNull());
    } finally {
      stop?.();
      source.clear();
      client.clear();
    }
  },
);

test("Retry replaces a pending cold session check instead of treating its old response as fresh proof", async () => {
  const previous = deferred<Response>();
  const current = deferred<Response>();
  const fetchMock = vi
    .fn()
    .mockImplementationOnce(() => previous.promise)
    .mockImplementationOnce(() => current.promise);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("BroadcastChannel", undefined);
  const client = new QueryClient();
  const runtime = createOfflineAccessRuntime(client);
  const stop = runtime.start();
  let retry: Promise<void> | undefined;
  try {
    expect(fetchMock).toHaveBeenCalledOnce();
    retry = runtime.retryConnection();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    previous.resolve(sessionResponse());
    await Promise.resolve();
    expect(runtime.getSnapshot().canMutate).toBe(false);
    current.resolve(new Response(JSON.stringify({ data: { user: otherUser } })));
    await retry;
    expect(client.getQueryData(offlineAuthKey)).toEqual({ data: { user: otherUser } });
    expect(runtime.getSnapshot()).toMatchObject({ readAccountId: 2, canMutate: true });
  } finally {
    previous.resolve(sessionResponse());
    current.resolve(sessionResponse());
    await retry;
    stop();
    client.clear();
  }
});

test("restart during pending verification cannot promote cached auth before the request completes", async () => {
  const flush = controlNotifications();
  const response = deferred<Response>();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => response.promise),
  );
  const { client, runtime, stop } = setup();
  let stopRestart: (() => void) | undefined;
  let retry: Promise<void> | undefined;
  try {
    flush();
    window.dispatchEvent(new Event("xeniway:server-unavailable"));
    retry = runtime.retryConnection();
    expect(client.getQueryState(offlineAuthKey)?.fetchStatus).toBe("fetching");
    stop();
    stopRestart = runtime.start();
    flush();
    expect(client.getQueryState(offlineAuthKey)?.fetchStatus).toBe("fetching");

    expect.soft(runtime.getSnapshot().canMutate).toBe(false);
    expect.soft(assertAuthenticatedWrite).toThrow();
    response.resolve(errorResponse(500));
    await retry;
    flush();
    expect(runtime.getSnapshot().canMutate).toBe(false);
  } finally {
    response.resolve(errorResponse(500));
    await retry;
    stopRestart?.();
    stop();
    client.clear();
  }
});
