import "fake-indexeddb/auto";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren, ReactNode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { applicationKeys } from "../../lib/api";
import { authKeys, useAuthMutations } from "../../lib/queries";
import { store } from "../../store";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import { LoginPage } from "../auth/login/login-page.view";
import { OfflineAccessProvider, useOfflineAccess } from "./offline-access.view";
import { saveOfflineLogoutNotice } from "./offline-logout-notice";
import { offlineQuerySnapshot } from "./offline-query-cache";
import * as deviceStorage from "./offline-store";
import { OFFLINE_RETENTION_MS } from "./offline-types";

const user = { id: 1, email: "one@example.com" };
const otherUser = { id: 2, email: "two@example.com" };
const clients: QueryClient[] = [];
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const fetcher = vi.fn<typeof fetch>();

beforeEach(async () => {
  window.sessionStorage.clear();
  await initializeTestI18n();
  vi.stubGlobal("BroadcastChannel", undefined);
  fetcher.mockReset();
  fetcher.mockImplementation(async (path) => {
    switch (String(path)) {
      case "/api/auth/csrf":
        return json({ data: { csrfToken: "public-csrf" } });
      case "/api/auth/logout":
        return json({ data: { message: "Logged out successfully" } });
      case "/api/auth/login":
      case "/api/auth/register":
        return json({ data: { user: otherUser, csrfToken: "new-session-csrf" } });
      default:
        return json({ data: { user: null } });
    }
  });
  vi.stubGlobal("fetch", fetcher);
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const client of clients.splice(0)) {
    client.clear();
  }
  window.sessionStorage.clear();
  await deviceStorage.clearOfflineDevice();
});

function setup(signedIn = false, content?: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  client.setQueryData(authKeys.me, { data: { user: signedIn ? user : null } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "initial-csrf" } });
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={client}>
          <OfflineAccessProvider>
            <MemoryRouter initialEntries={["/login"]}>
              {children}
              {content}
            </MemoryRouter>
          </OfflineAccessProvider>
        </QueryClientProvider>
      </Provider>
    );
  }
  return { client, wrapper: Wrapper };
}

test("login shows the non-private remote-sign-out notice again after a reload", async () => {
  const initial = setup(true);
  const access = renderHook(useOfflineAccess, initial);
  await act(async () => access.result.current.signOutLocally({ discloseRemoteLimit: true }));
  expect(access.result.current.readAccountId).toBeNull();
  access.unmount();

  const reloaded = setup();
  render(<LoginPage />, reloaded);
  expect(screen.getByRole("region", { name: "Sign-out status" })).toHaveTextContent(
    "Remote sign-out has not been confirmed",
  );
  expect(screen.getByRole("button", { name: "Finish sign out" })).toBeEnabled();
  expect(document.body).not.toHaveTextContent(user.email);
});

test("a stored logout limitation does not silently restore the old server session", async () => {
  saveOfflineLogoutNotice();
  fetcher.mockResolvedValue(json({ data: { user } }));
  const options = setup(true);
  const access = renderHook(useOfflineAccess, options);
  expect(access.result.current.readAccountId).toBeNull();
  await act(async () => access.result.current.retryConnection());
  expect(access.result.current.readAccountId).toBeNull();
  expect(access.result.current.canMutate).toBe(false);
  expect(access.result.current.localLogout).toBe(true);
});

test("a denied notice write still erases private device data and reports its limited persistence", async () => {
  const options = setup(true, <LoginPage />);
  const now = Date.now();
  await deviceStorage.enableOfflineAccount({
    version: 1,
    userId: user.id,
    email: user.email,
    verifiedAt: now,
    expiresAt: now + OFFLINE_RETENTION_MS,
  });
  for (const list of ["active", "archive", "blacklist"] as const) {
    options.client.setQueryData(applicationKeys.list(user.id, list), { data: { applications: [] } });
  }
  await deviceStorage.saveOfflineSnapshot(user.id, offlineQuerySnapshot(options.client, user.id));
  await deviceStorage.markOfflineReady(user.id, "test");
  const original = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
    if (this === window.sessionStorage) {
      throw new DOMException("Denied", "SecurityError");
    }
    original.call(this, key, value);
  });
  const access = renderHook(useOfflineAccess, options);
  await act(async () => access.result.current.signOutLocally({ discloseRemoteLimit: true }));
  expect(await deviceStorage.restoreOfflineAccount()).toBeNull();
  expect(access.result.current.readAccountId).toBeNull();
  expect(access.result.current).toMatchObject({ localLogout: true, logoutNoticeStorageFailed: true });
  expect(screen.getByText(/It may be missing or out of date after a reload/)).toBeVisible();
});

test.each(["server failure", "invalid success response"])(
  "Finish sign out keeps the notice after %s and retries only when requested",
  async (failure) => {
    saveOfflineLogoutNotice();
    const original = fetcher.getMockImplementation();
    fetcher.mockImplementation(async (path, init) => {
      if (String(path).endsWith("/logout")) {
        return failure === "server failure"
          ? json({ error: { message: "private server details" } }, 500)
          : json({ unrelated: true });
      }
      return original?.(path, init) as Promise<Response>;
    });
    const options = setup();
    const userEvents = userEvent.setup();
    render(<LoginPage />, options);
    await userEvents.click(screen.getByRole("button", { name: "Finish sign out" }));
    expect(await screen.findByText(/Remote sign-out could not be confirmed/)).toBeVisible();
    expect(screen.getByRole("region", { name: "Sign-out status" })).toBeVisible();
    expect(document.body).not.toHaveTextContent("private server details");
    expect(window.sessionStorage.getItem("xeniway.offline-logout-notice")).toBe("true");
    expect(fetcher.mock.calls.filter(([path]) => String(path).endsWith("/logout"))).toHaveLength(1);
    fetcher.mockImplementation(async (path) =>
      String(path).endsWith("/csrf")
        ? json({ data: { csrfToken: "fresh-public-csrf" } })
        : json({ data: { message: "Logged out successfully" } }),
    );
    await userEvents.click(screen.getByRole("button", { name: "Finish sign out" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Sign-out status" })).not.toBeInTheDocument());
    expect(window.sessionStorage.getItem("xeniway.offline-logout-notice")).toBeNull();
    const lastLogout = fetcher.mock.calls.filter(([path]) => String(path).endsWith("/logout")).at(-1);
    expect(new Headers(lastLogout?.[1]?.headers).get("x-csrf-token")).toBe("fresh-public-csrf");
  },
);

test.each(["login", "register"] as const)(
  "successful explicit %s clears the previous session's notice",
  async (action) => {
    saveOfflineLogoutNotice();
    const options = setup();
    const view = renderHook(() => ({ auth: useAuthMutations(), access: useOfflineAccess() }), options);
    await act(async () => {
      await view.result.current.auth[action].mutateAsync({ email: otherUser.email, password: "password123" });
    });
    await waitFor(() => expect(view.result.current.access.localLogout).toBe(false));
    expect(view.result.current.access.readAccountId).toBe(otherUser.id);
    expect(window.sessionStorage.getItem("xeniway.offline-logout-notice")).toBeNull();
  },
);

test("a delayed failed logout cannot republish its notice after a newer sign-in", async () => {
  let complete!: (response: Response) => void;
  const remote = new Promise<Response>((resolve) => {
    complete = resolve;
  });
  const original = fetcher.getMockImplementation();
  fetcher.mockImplementation((path, init) =>
    String(path).endsWith("/logout") ? remote : (original?.(path, init) as Promise<Response>),
  );
  const options = setup(true);
  const view = renderHook(() => ({ auth: useAuthMutations(), access: useOfflineAccess() }), options);
  let completion!: Promise<unknown>;
  act(() => {
    completion = view.result.current.auth.logout.mutateAsync();
  });
  await waitFor(() => expect(view.result.current.access.readAccountId).toBeNull());
  await act(async () => {
    await view.result.current.auth.login.mutateAsync({ email: otherUser.email, password: "password123" });
    complete(json({ error: { message: "failed" } }, 500));
    await completion;
  });
  await waitFor(() => expect(view.result.current.access.readAccountId).toBe(otherUser.id));
  expect(view.result.current.access.localLogout).toBe(false);
  expect(window.sessionStorage.getItem("xeniway.offline-logout-notice")).toBeNull();
});

test("a session check cannot undo an online logout while its remote request is pending", async () => {
  let complete!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    complete = resolve;
  });
  const original = fetcher.getMockImplementation();
  fetcher.mockImplementation((path, init) => {
    switch (String(path)) {
      case "/api/auth/logout":
        return pending;
      case "/api/auth/me":
        return Promise.resolve(json({ data: { user } }));
      default:
        return original?.(path, init) as Promise<Response>;
    }
  });
  const options = setup(true);
  const view = renderHook(() => ({ auth: useAuthMutations(), access: useOfflineAccess() }), options);
  let completion!: Promise<unknown>;
  act(() => {
    completion = view.result.current.auth.logout.mutateAsync();
  });
  await waitFor(() => expect(view.result.current.access.readAccountId).toBeNull());
  await act(async () => view.result.current.access.retryConnection());
  expect(view.result.current.access.readAccountId).toBeNull();
  expect(view.result.current.access.canMutate).toBe(false);
  await act(async () => {
    complete(json({ error: { message: "failed" } }, 500));
    await completion;
  });
  expect(view.result.current.access.localLogout).toBe(true);
  expect(window.sessionStorage.getItem("xeniway.offline-logout-notice")).toBe("true");
});

test.each([user.id, otherUser.id])(
  "an explicit sign-in in another tab supersedes pending Finish sign out for account %s",
  async (userId) => {
    saveOfflineLogoutNotice();
    let receive!: (event: MessageEvent) => void;
    vi.stubGlobal(
      "BroadcastChannel",
      class {
        set onmessage(handler: (event: MessageEvent) => void) {
          receive = handler;
        }
        postMessage() {}
        close() {}
      },
    );
    let complete!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      complete = resolve;
    });
    const original = fetcher.getMockImplementation();
    fetcher.mockImplementation((path, init) =>
      String(path).endsWith("/csrf") ? pending : (original?.(path, init) as Promise<Response>),
    );
    const view = renderHook(useOfflineAccess, setup());
    let finishing!: Promise<void>;
    act(() => {
      finishing = view.result.current.finishRemoteLogout();
    });
    await waitFor(() => expect(view.result.current.logoutFinish).toBe("pending"));
    await act(async () => {
      receive(new MessageEvent("message", { data: { type: "session-changed", userId } }));
      complete(json({ data: { csrfToken: "superseded-csrf" } }));
      await finishing;
    });
    expect(fetcher.mock.calls.some(([path]) => String(path).endsWith("/logout"))).toBe(false);
    await waitFor(() => expect(view.result.current.localLogout).toBe(false));
    expect(view.result.current.logoutFinish).toBe("idle");
    expect(window.sessionStorage.getItem("xeniway.offline-logout-notice")).toBeNull();
  },
);

test.each(["csrf", "logout"])(
  "a Finish sign out completion from %s cannot affect a newer explicit session",
  async (phase) => {
    saveOfflineLogoutNotice();
    let complete!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      complete = resolve;
    });
    const original = fetcher.getMockImplementation();
    fetcher.mockImplementation((path, init) =>
      String(path).endsWith(`/${phase}`) ? pending : (original?.(path, init) as Promise<Response>),
    );
    const options = setup();
    const view = renderHook(() => ({ auth: useAuthMutations(), access: useOfflineAccess() }), options);
    let finishing!: Promise<void>;
    act(() => {
      finishing = view.result.current.access.finishRemoteLogout();
    });
    await waitFor(() => expect(fetcher.mock.calls.some(([path]) => String(path).endsWith(`/${phase}`))).toBe(true));
    await act(async () => {
      await view.result.current.auth.login.mutateAsync({ email: otherUser.email, password: "password123" });
      complete(json({ data: { csrfToken: "old-csrf", message: "Logged out successfully" } }));
      await finishing;
    });
    await waitFor(() => expect(view.result.current.access.readAccountId).toBe(otherUser.id));
    expect(view.result.current.access.localLogout).toBe(false);
    expect(view.result.current.access.logoutFinish).toBe("idle");
    expect(options.client.getQueryData(authKeys.csrf)).toEqual({ data: { csrfToken: "new-session-csrf" } });
    if (phase === "csrf") {
      expect(fetcher.mock.calls.some(([path]) => String(path).endsWith("/logout"))).toBe(false);
    }
  },
);

test.each(["logout", "finish"])(
  "confirmed %s rejects a session check started before remote revocation",
  async (action) => {
    if (action === "finish") {
      saveOfflineLogoutNotice();
    }
    let complete!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      complete = resolve;
    });
    const original = fetcher.getMockImplementation();
    fetcher.mockImplementation((path, init) =>
      String(path).endsWith("/me") ? pending : (original?.(path, init) as Promise<Response>),
    );
    const options = setup(true);
    const view = renderHook(() => ({ access: useOfflineAccess(), auth: useAuthMutations() }), options);
    let signedOut!: Promise<unknown>;
    let confirm!: (response: Response) => void;
    if (action === "logout") {
      // Hold the remote response until the new session check has started.
      const remote = new Promise<Response>((resolve) => {
        confirm = resolve;
      });
      const current = fetcher.getMockImplementation();
      fetcher.mockImplementation((path, init) =>
        String(path).endsWith("/logout") ? remote : (current?.(path, init) as Promise<Response>),
      );
      act(() => {
        signedOut = view.result.current.auth.logout.mutateAsync();
      });
      await waitFor(() => expect(view.result.current.access.localLogout).toBe(true));
    }
    let checking!: Promise<void>;
    act(() => {
      checking = options.client.invalidateQueries({ queryKey: authKeys.me });
    });
    await waitFor(() => expect(fetcher.mock.calls.some(([path]) => String(path).endsWith("/me"))).toBe(true));
    await act(async () => {
      if (action === "finish") {
        await view.result.current.access.finishRemoteLogout();
      } else {
        confirm(json({ data: { message: "Logged out successfully" } }));
        await signedOut;
      }
      complete(json({ data: { user } }));
      await checking;
    });
    expect(view.result.current.access.readAccountId).toBeNull();
    expect(view.result.current.access.canMutate).toBe(false);
    expect(options.client.getQueryData(authKeys.me)).toEqual({ data: { user: null } });
  },
);

test("an old Finish sign out success cannot clear a newer logout notice", async () => {
  saveOfflineLogoutNotice();
  let complete!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    complete = resolve;
  });
  const original = fetcher.getMockImplementation();
  fetcher.mockImplementation((path, init) =>
    String(path).endsWith("/logout") ? pending : (original?.(path, init) as Promise<Response>),
  );
  const options = setup();
  const view = renderHook(() => ({ auth: useAuthMutations(), access: useOfflineAccess() }), options);
  let finishing!: Promise<void>;
  act(() => {
    finishing = view.result.current.access.finishRemoteLogout();
  });
  await waitFor(() => expect(fetcher.mock.calls.some(([path]) => String(path).endsWith("/logout"))).toBe(true));
  await act(async () => {
    await view.result.current.auth.login.mutateAsync({ email: otherUser.email, password: "password123" });
    await view.result.current.access.signOutLocally({ discloseRemoteLimit: true });
    complete(json({ data: { message: "Logged out successfully" } }));
    await finishing;
  });
  await waitFor(() => expect(view.result.current.access.localLogout).toBe(true));
  expect(view.result.current.access.readAccountId).toBeNull();
  expect(window.sessionStorage.getItem("xeniway.offline-logout-notice")).toBe("true");
});

test("denied notice removal preserves successful sign-in and warns that the marker may be stale", async () => {
  saveOfflineLogoutNotice();
  const original = Storage.prototype.removeItem;
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function (this: Storage, key) {
    if (this === window.sessionStorage) {
      throw new DOMException("Denied", "SecurityError");
    }
    original.call(this, key);
  });
  const options = setup();
  const view = renderHook(() => ({ auth: useAuthMutations(), access: useOfflineAccess() }), options);
  await act(async () => {
    await view.result.current.auth.login.mutateAsync({ email: otherUser.email, password: "password123" });
  });
  await waitFor(() => expect(view.result.current.access.readAccountId).toBe(otherUser.id));
  expect(view.result.current.access).toMatchObject({ localLogout: false, logoutNoticeStorageFailed: true });
});
