import "fake-indexeddb/auto";
import { type DehydratedState, onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { applicationKeys, assertAuthenticatedWrite } from "../../lib/api";
import { authKeys, useApplicationDetail, useApplications, useAuthMutations, useCsrfToken } from "../../lib/queries";
import { store } from "../../store";
import { createApplicationWorkspaceData } from "../applications/application-workspace/test-support/application-workspace-fixtures";
import { OfflineAccessProvider, useOfflineAccess, useReadAccountId } from "./offline-access.view";
import { offlineQuerySnapshot } from "./offline-query-cache";
import {
  clearOfflineDevice,
  enableOfflineAccount,
  loadOfflineSnapshot,
  markOfflineReady,
  restoreOfflineAccount,
  saveOfflineSnapshot,
} from "./offline-store";
import type { OfflineAccountMetadata } from "./offline-types";
import { OFFLINE_RETENTION_MS } from "./offline-types";

beforeEach(() => {
  vi.stubGlobal("BroadcastChannel", undefined);
});

test.each(["local", "cross-tab"])("%s logout cannot be undone by a delayed session response", async (mode) => {
  let respond!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    respond = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => pending),
  );
  const channels: Array<{ onmessage: ((event: { data: { type: string } }) => void) | null }> = [];
  vi.stubGlobal(
    "BroadcastChannel",
    class {
      onmessage: ((event: { data: { type: string } }) => void) | null = null;
      constructor() {
        channels.push(this);
      }
      postMessage() {}
      close() {}
    },
  );
  const client = new QueryClient();
  const view = renderHook(() => useOfflineAccess(), { wrapper: runtime(client) });
  try {
    await waitFor(() => expect(client.getQueryState(authKeys.me)?.fetchStatus).toBe("fetching"));
    await act(async () => {
      if (mode === "local") {
        await view.result.current.signOutLocally();
      } else {
        channels.find((channel) => channel.onmessage)?.onmessage?.({ data: { type: "logout" } });
      }
    });
    expect(view.result.current.readAccountId).toBeNull();
    await act(async () => {
      respond(new Response(JSON.stringify({ data: { user: { id: 1, email: "candidate@example.com" } } })));
      await pending;
    });
    await waitFor(() => expect(client.getQueryState(authKeys.me)?.fetchStatus).toBe("idle"));
    expect(client.getQueryData(authKeys.me)).toEqual({ data: { user: null } });
    expect(view.result.current.readAccountId).toBeNull();
    expect(view.result.current.canMutate).toBe(false);
  } finally {
    view.unmount();
    client.clear();
  }
});

test("a transient server failure retains a verified read-only route without a download and recovers on retry", async () => {
  let available = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string) => {
      if (path.endsWith("/me")) {
        return new Response(JSON.stringify({ data: { user: { id: 1, email: "candidate@example.com" } } }));
      }
      return available
        ? new Response(JSON.stringify({ data: { applications: [] } }))
        : new Response(JSON.stringify({ error: { code: "INTERNAL_SERVER_ERROR", message: "Server error" } }), {
            status: 500,
          });
    }),
  );
  const client = new QueryClient();
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  const view = renderHook(() => ({ access: useOfflineAccess(), applications: useApplications() }), {
    wrapper: runtime(client),
  });
  try {
    await waitFor(() => expect(client.getQueryState(applicationKeys.list(1, "active"))?.status).toBe("error"));
    expect(view.result.current.access.account).toBeNull();
    expect(view.result.current.access.readAccountId).toBe(1);
    expect(view.result.current.access.canMutate).toBe(false);
    expect(view.result.current.access.canReadRemote).toBe(false);
    available = true;
    act(() => window.dispatchEvent(new Event("xeniway:retry-connection")));
    await waitFor(() => expect(view.result.current.access.canMutate).toBe(true));
    await waitFor(() => expect(view.result.current.applications.data).toEqual([]));
  } finally {
    view.unmount();
    client.clear();
  }
});
test("sign-in after a rejected connection retry restores the authenticated write guard", async () => {
  const user = { id: 1, email: "candidate@example.com" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string) => {
      if (path.endsWith("/me")) {
        return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }), {
          status: 401,
        });
      }
      if (path.endsWith("/csrf")) {
        return new Response(JSON.stringify({ data: { csrfToken: "public-csrf" } }));
      }
      return new Response(JSON.stringify({ data: { user, csrfToken: "session-csrf" } }));
    }),
  );
  const client = new QueryClient();
  client.setQueryData(authKeys.me, { data: { user } });
  const view = renderHook(() => ({ access: useOfflineAccess(), login: useAuthMutations().login }), {
    wrapper: runtime(client),
  });
  try {
    await waitFor(() => expect(view.result.current.access.canMutate).toBe(true));
    act(() => window.dispatchEvent(new Event("xeniway:retry-connection")));
    await waitFor(() => expect(view.result.current.access.readAccountId).toBeNull());
    await waitFor(() => expect(client.getQueryData(authKeys.csrf)).toBeDefined());
    await act(async () => {
      await view.result.current.login.mutateAsync({ email: user.email, password: "password" });
    });
    await waitFor(() => expect(view.result.current.access.canMutate).toBe(true));
    expect(assertAuthenticatedWrite).not.toThrow();
  } finally {
    view.unmount();
    client.clear();
  }
});
test.each(["login", "register"] as const)(
  "successful %s after a cold transient session failure restores online access without BroadcastChannel",
  async (action) => {
    const user = { id: 1, email: "candidate@example.com" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path: string) => {
        if (path.endsWith("/me")) {
          return new Response(JSON.stringify({ error: { code: "REQUEST_FAILED", message: "Unavailable" } }), {
            status: 500,
          });
        }
        if (path.endsWith("/csrf")) {
          return new Response(JSON.stringify({ data: { csrfToken: "public-csrf" } }));
        }
        return new Response(JSON.stringify({ data: { user, csrfToken: "session-csrf" } }));
      }),
    );
    const client = new QueryClient();
    const view = renderHook(() => ({ access: useOfflineAccess(), auth: useAuthMutations() }), {
      wrapper: runtime(client),
    });
    try {
      await waitFor(() => expect(client.getQueryState(authKeys.me)?.status).toBe("error"));
      await waitFor(() => expect(client.getQueryData(authKeys.csrf)).toBeDefined());
      await act(async () => {
        await view.result.current.auth[action].mutateAsync({ email: user.email, password: "password" });
      });
      await waitFor(() => expect(view.result.current.access.canMutate).toBe(true));
      expect(view.result.current.access.canReadRemote).toBe(true);
      expect(assertAuthenticatedWrite).not.toThrow();
    } finally {
      view.unmount();
      client.clear();
    }
  },
);

test.each(["previous owner", "rejected"])(
  "a pre-sign-in session response (%s) cannot replace the newly authenticated owner",
  async (responseKind) => {
    let release!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const signedIn = { id: 2, email: "new@example.com" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path: string) => {
        if (path.endsWith("/me")) {
          return pending;
        }
        return new Response(JSON.stringify({ data: { user: signedIn, csrfToken: "new-csrf" } }));
      }),
    );
    const client = new QueryClient();
    client.setQueryData(authKeys.csrf, { data: { csrfToken: "public-csrf" } });
    const view = renderHook(() => ({ access: useOfflineAccess(), login: useAuthMutations().login }), {
      wrapper: runtime(client),
    });
    try {
      await waitFor(() => expect(client.getQueryState(authKeys.me)?.fetchStatus).toBe("fetching"));
      const sessionCheck = client.getQueryCache().find({ queryKey: authKeys.me })?.promise;
      await act(async () => {
        await view.result.current.login.mutateAsync({ email: signedIn.email, password: "password" });
      });
      await act(async () => {
        release(
          responseKind === "rejected"
            ? new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }), {
                status: 401,
              })
            : new Response(JSON.stringify({ data: { user: { id: 1, email: "old@example.com" } } })),
        );
        await sessionCheck?.catch(() => {});
      });
      expect(client.getQueryData(authKeys.me)).toEqual({ data: { user: signedIn } });
      await waitFor(() => expect(view.result.current.access.readAccountId).toBe(2));
      expect(assertAuthenticatedWrite).not.toThrow();
    } finally {
      release(new Response(JSON.stringify({ data: { user: signedIn } })));
      view.unmount();
      client.clear();
    }
  },
);

test("removing a download online revokes memory fallback on later disconnect until fresh verification", async () => {
  const user = { id: 1, email: "candidate@example.com" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ data: { user } }))),
  );
  const client = new QueryClient();
  client.setQueryData(authKeys.me, { data: { user } });
  const account = await ready(client);
  const view = renderHook(() => useOfflineAccess(), { wrapper: runtime(client, account) });
  try {
    await waitFor(() => expect(view.result.current.canMutate).toBe(true));
    await act(async () => {
      await view.result.current.removeDownload();
    });
    expect(view.result.current.canMutate).toBe(true);
    act(() => window.dispatchEvent(new Event("offline")));
    await waitFor(() => expect(view.result.current.canMutate).toBe(false));
    expect(view.result.current.readAccountId).toBeNull();
    act(() => window.dispatchEvent(new Event("xeniway:retry-connection")));
    await waitFor(() => expect(view.result.current.canMutate).toBe(true));
    act(() => window.dispatchEvent(new Event("offline")));
    await waitFor(() => expect(view.result.current.canMutate).toBe(false));
    expect(view.result.current.readAccountId).toBe(1);
  } finally {
    view.unmount();
    client.clear();
    onlineManager.setOnline(true);
  }
});
afterEach(async () => {
  vi.useRealTimers();
  await clearOfflineDevice();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("same-owner preparation replacement stops the old tab's automatic persistence", async () => {
  const client = new QueryClient();
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  const account = await ready(client);
  const channels: Array<{ onmessage: ((event: { data: { type: string; userId: number } }) => void) | null }> = [];
  vi.stubGlobal(
    "BroadcastChannel",
    class {
      onmessage: ((event: { data: { type: string; userId: number } }) => void) | null = null;
      constructor() {
        channels.push(this);
      }
      postMessage() {}
      close() {}
    },
  );
  const view = renderHook(() => useOfflineAccess(), { wrapper: runtime(client, account) });
  try {
    act(() =>
      channels.find((channel) => channel.onmessage)?.onmessage?.({ data: { type: "account-replaced", userId: 1 } }),
    );
    await waitFor(() => expect(view.result.current.account).toBeNull());
    expect(view.result.current.readAccountId).toBe(1);
    expect(view.result.current.canMutate).toBe(true);
  } finally {
    view.unmount();
    client.clear();
  }
});

test("an old tab's expiry timer cannot delete a renewed same-owner download", async () => {
  const client = new QueryClient();
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  const old = await ready(client);
  if (!old) {
    throw new Error("Missing fixture account");
  }
  const now = Date.now();
  const generation = await enableOfflineAccount({
    version: 1,
    userId: 1,
    email: old.email,
    verifiedAt: now,
    expiresAt: now + OFFLINE_RETENTION_MS,
  });
  await saveOfflineSnapshot(1, offlineQuerySnapshot(client, 1), generation);
  await markOfflineReady(1, "renewed", generation);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const view = renderHook(() => useOfflineAccess(), {
    wrapper: runtime(client, { ...old, expiresAt: Date.now() + 50 }),
  });
  try {
    await act(async () => vi.advanceTimersByTimeAsync(51));
    expect((await restoreOfflineAccount(Date.now()))?.buildId).toBe("renewed");
  } finally {
    view.unmount();
    client.clear();
    vi.useRealTimers();
  }
});

function runtime(
  client: QueryClient,
  initialAccount: OfflineAccountMetadata | null = null,
  restoration?: Promise<{ account: OfflineAccountMetadata; snapshot: DehydratedState } | null>,
) {
  return ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <OfflineAccessProvider initialAccount={initialAccount} restoration={restoration}>
          {children}
        </OfflineAccessProvider>
      </QueryClientProvider>
    </Provider>
  );
}

test.each([
  "none",
  "local-clear",
  "logout-reauthenticated",
  "account-replaced",
  "session-changed",
  "removed",
  "unrelated-removed",
])("deferred restoration respects revocation (%s)", async (revocation) => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new TypeError("Network unavailable"))),
  );
  const channels: Array<{ onmessage: ((event: { data: { type: string; userId: number } }) => void) | null }> = [];
  vi.stubGlobal(
    "BroadcastChannel",
    class {
      onmessage: ((event: { data: { type: string; userId: number } }) => void) | null = null;
      constructor() {
        channels.push(this);
      }
      postMessage() {}
      close() {}
    },
  );
  const source = new QueryClient();
  const account = await ready(source);
  expect(account).not.toBeNull();
  if (!account) {
    throw new Error("Ready profile missing");
  }
  const snapshot = offlineQuerySnapshot(source, account.userId);
  let resolve!: (value: { account: OfflineAccountMetadata; snapshot: DehydratedState }) => void;
  const restoration = new Promise<{ account: OfflineAccountMetadata; snapshot: DehydratedState }>((done) => {
    resolve = done;
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { result, unmount } = renderHook(() => useOfflineAccess(), { wrapper: runtime(client, null, restoration) });
  await waitFor(() => expect(client.getQueryState(authKeys.me)?.status).toBe("error"));
  expect(result.current.checking).toBe(true);
  await act(async () => {
    switch (revocation) {
      case "local-clear":
        await result.current.removeDownload();
        break;
      case "logout-reauthenticated":
        await result.current.signOutLocally();
        client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
        break;
      case "none":
        break;
      default:
        for (const channel of channels) {
          channel.onmessage?.({
            data: {
              type: revocation === "unrelated-removed" ? "removed" : revocation,
              userId: ["account-replaced", "session-changed", "unrelated-removed"].includes(revocation) ? 2 : 1,
            },
          });
        }
    }
    resolve({ account, snapshot });
    await restoration;
  });
  const allowed = revocation === "none" || revocation === "unrelated-removed";
  await waitFor(() => expect(result.current.account?.userId ?? null).toBe(allowed ? 1 : null));
  expect(result.current.readAccountId).toBe(allowed ? 1 : null);
  expect(client.getQueryData(applicationKeys.list(1, "active"))).toEqual(
    allowed ? { data: { applications: [] } } : undefined,
  );
  expect(result.current.checking).toBe(false);
  unmount();
  client.clear();
  source.clear();
});
async function ready(client: QueryClient) {
  const now = Date.now();
  await enableOfflineAccount({
    version: 1,
    userId: 1,
    email: "candidate@example.com",
    verifiedAt: now,
    expiresAt: now + OFFLINE_RETENTION_MS,
  });
  for (const list of ["active", "archive", "blacklist"] as const) {
    client.setQueryData(applicationKeys.list(1, list), { data: { applications: [] } });
  }
  await saveOfflineSnapshot(1, offlineQuerySnapshot(client, 1));
  await markOfflineReady(1, "test");
  return restoreOfflineAccount(Date.now());
}

test("signed-out online startup can bootstrap the public CSRF session", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string) =>
      path.endsWith("csrf")
        ? new Response(JSON.stringify({ data: { csrfToken: "public-csrf" } }))
        : new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }), { status: 401 }),
    ),
  );
  const client = new QueryClient();
  const { result } = renderHook(() => useCsrfToken(), { wrapper: runtime(client) });
  await waitFor(() => expect(result.current.data).toBe("public-csrf"));
  client.clear();
});

test("a late signed-out check preserves the public CSRF token through subsequent renders", async () => {
  const source = new QueryClient();
  await ready(source); // Durable opt-in can exist even when this tab has not restored its owner yet.
  let respond!: (response: Response) => void;
  const me = new Promise<Response>((resolve) => {
    respond = resolve;
  });
  const fetchMock = vi.fn(async (path: string) =>
    path.endsWith("/me") ? me : new Response(JSON.stringify({ data: { csrfToken: "public-csrf" } })),
  );
  vi.stubGlobal("fetch", fetchMock);
  const client = new QueryClient();
  const { result, rerender, unmount } = renderHook(() => ({ csrf: useCsrfToken(), access: useOfflineAccess() }), {
    wrapper: runtime(client),
  });
  await waitFor(() => expect(result.current.csrf.data).toBe("public-csrf"));
  await act(async () => {
    respond(
      new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }), { status: 401 }),
    );
    await me;
  });
  await waitFor(() => expect(client.getQueryData(authKeys.me)).toEqual({ data: { user: null } }));
  rerender();
  expect(client.getQueryData(authKeys.csrf)).toEqual({ data: { csrfToken: "public-csrf" } });
  expect(fetchMock.mock.calls.filter(([path]) => path.endsWith("csrf"))).toHaveLength(1);
  expect(result.current.access.canMutate).toBe(false);
  expect(result.current.access.localLogout).toBe(false);
  await waitFor(async () => expect(await restoreOfflineAccount(Date.now())).toBeNull());
  unmount();
  client.clear();
  source.clear();
});

test("rejection of a previously verified session refreshes its authenticated CSRF token", async () => {
  let csrfRequests = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string) => {
      if (path.endsWith("/me")) {
        return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }), {
          status: 401,
        });
      }
      csrfRequests += 1;
      return new Response(JSON.stringify({ data: { csrfToken: csrfRequests === 1 ? "session-csrf" : "public-csrf" } }));
    }),
  );
  const client = new QueryClient();
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  const { result, unmount } = renderHook(() => ({ csrf: useCsrfToken(), access: useOfflineAccess() }), {
    wrapper: runtime(client),
  });
  await waitFor(() => expect(result.current.csrf.data).toBe("session-csrf"));
  expect(result.current.access.canMutate).toBe(true);
  await act(async () => {
    await client.invalidateQueries({ queryKey: authKeys.me });
  });
  await waitFor(() => expect(result.current.csrf.data).toBe("public-csrf"));
  expect(csrfRequests).toBe(2);
  expect(result.current.access.readAccountId).toBeNull();
  unmount();
  client.clear();
});

test("persists an online workspace read after restoring a ready device profile", async () => {
  // Exercise subscription/persistence ordering independently of wall-clock changes
  // while IndexedDB opens and queues concurrent read/write transactions.
  vi.spyOn(Date, "now").mockReturnValue(Date.now());
  const client = new QueryClient();
  const account = await ready(client);
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (path: string) =>
        new Response(
          JSON.stringify(
            path.endsWith("/me")
              ? { data: { user: { id: 1, email: "candidate@example.com" } } }
              : { data: createApplicationWorkspaceData() },
          ),
        ),
    ),
  );
  const { result } = renderHook(() => useApplicationDetail(3), { wrapper: runtime(client, account) });
  await waitFor(() => expect(result.current.data?.application.id).toBe(3));
  await waitFor(async () =>
    expect((await loadOfflineSnapshot(1, Date.now()))?.queries.some((query) => query.queryKey[2] === "detail")).toBe(
      true,
    ),
  );
  client.clear();
});

test.each(["transport", "server"])(
  "logout clears a later opt-in even when remote logout fails (%s)",
  async (failure) => {
    const client = new QueryClient();
    client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
    client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        if (failure === "transport") {
          throw new TypeError("Network unavailable");
        }
        return new Response(JSON.stringify({ error: { code: "REQUEST_FAILED", message: "Failed" } }), { status: 500 });
      }),
    );
    const { result } = renderHook(() => ({ logout: useAuthMutations().logout, access: useOfflineAccess() }), {
      wrapper: runtime(client),
    });
    await ready(client); // Another tab opts in after this runtime mounted with no profile.
    await act(async () => result.current.logout.mutateAsync());
    expect(await restoreOfflineAccount(Date.now())).toBeNull();
    await waitFor(() => {
      expect(result.current.access.readAccountId).toBeNull();
      expect(result.current.access.localLogout).toBe(true);
    });
    client.clear();
  },
);

test("cached device access never impersonates a server session", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new TypeError("Network unavailable"))),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const now = Date.now();
  const account = {
    version: 1 as const,
    userId: 7,
    email: "cached@example.com",
    verifiedAt: now,
    expiresAt: now + OFFLINE_RETENTION_MS,
    ready: true,
    buildId: "test",
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <OfflineAccessProvider initialAccount={account}>{children}</OfflineAccessProvider>
    </QueryClientProvider>
  );
  const { result } = renderHook(() => ({ access: useOfflineAccess(), id: useReadAccountId() }), { wrapper });
  await waitFor(() => expect(result.current.id).toBe(7));
  expect(result.current.access.canMutate).toBe(false);
  expect(client.getQueryData(["auth", "me"])).toBeUndefined();
  client.clear();
});

test("a confirmed unauthorized session cannot fall back to a cached account", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }), { status: 401 }),
    ),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const now = Date.now();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <OfflineAccessProvider
        initialAccount={{
          version: 1,
          userId: 7,
          email: "cached@example.com",
          verifiedAt: now,
          expiresAt: now + OFFLINE_RETENTION_MS,
          ready: true,
          buildId: "test",
        }}
      >
        {children}
      </OfflineAccessProvider>
    </QueryClientProvider>
  );
  const { result } = renderHook(() => useOfflineAccess(), { wrapper });
  await waitFor(() => expect(result.current.readAccountId).toBeNull());
  expect(result.current.canMutate).toBe(false);
  client.clear();
});
