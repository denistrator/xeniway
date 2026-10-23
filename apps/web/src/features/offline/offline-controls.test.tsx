import "fake-indexeddb/auto";
import { onlineManager, QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { changeLocale } from "../../i18n/i18n";
import { en } from "../../i18n/locales/en";
import he from "../../i18n/locales/he";
import ru from "../../i18n/locales/ru";
import uk from "../../i18n/locales/uk";
import { applicationKeys } from "../../lib/api";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import * as offlineAccess from "./offline-access.model";
import { OfflineAccessProvider, useOfflineAccess } from "./offline-access.view";
import { createAccessState, selectAccess } from "./offline-access-machine";
import * as offlineRuntime from "./offline-access-runtime";
import { offlineCleanupStorageKey, rememberOfflineCleanup } from "./offline-cleanup";
import { OfflineControls } from "./offline-controls.view";
import { offlineQuerySnapshot } from "./offline-query-cache";
import {
  clearOfflineDevice,
  enableOfflineAccount,
  loadOfflineSnapshot,
  markOfflineReady,
  saveOfflineSnapshot,
} from "./offline-store";
import { OFFLINE_RETENTION_MS, type OfflineAccountMetadata } from "./offline-types";

const profile = { downloaded: true, canMutate: true };
const preparation = vi.hoisted(() => vi.fn());
const observeWorkerUpdate = vi.hoisted(() => vi.fn<(onUpdate: () => void) => () => void>(() => () => {}));
let access: ReturnType<typeof useOfflineAccess>;
let accountFixture: OfflineAccountMetadata;
const clients: QueryClient[] = [];

function currentRuntime() {
  const runtime = vi.mocked(offlineRuntime.createOfflineAccessRuntime).mock.results.at(-1)?.value;
  if (!runtime) {
    throw new Error("Missing mounted offline runtime");
  }
  return runtime;
}

function AccessProbe() {
  access = useOfflineAccess();
  return null;
}
function ControlsSurface() {
  return (
    <OfflineAccessProvider initialAccount={profile.downloaded ? savedAccount() : null}>
      <OfflineControls />
      <AccessProbe />
    </OfflineAccessProvider>
  );
}
vi.mock("./prepare-offline", () => ({ prepareOfflineAccount: preparation }));
vi.mock("./register-offline-worker", () => ({
  checkOfflineWorkerUpdate: observeWorkerUpdate,
  prepareOfflineAssets: vi.fn(async () => "build"),
}));

function savedAccount(): OfflineAccountMetadata {
  return { ...accountFixture };
}

function createClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["auth", "me"], { data: { user: { id: 1, email: "candidate@example.com" } } });
  clients.push(client);
  return client;
}

function renderControls(client = createClient(), title = en.offline.title as string) {
  const element = () => (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ControlsSurface />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(element());
  if (!profile.canMutate) {
    act(() => window.dispatchEvent(new Event("xeniway:server-unavailable")));
  }
  expect(screen.getByRole("heading", { name: new RegExp(title), level: 2 })).toBeVisible();
  return { ...view, client, refresh: () => view.rerender(element()) };
}

function pendingPreparation() {
  let resolve!: (account: OfflineAccountMetadata) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<OfflineAccountMetadata>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  preparation.mockReturnValue(promise);
  return { resolve, reject };
}

beforeEach(async () => {
  profile.downloaded = true;
  profile.canMutate = true;
  vi.clearAllMocks();
  vi.spyOn(offlineRuntime, "createOfflineAccessRuntime");
  preparation.mockReset();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  vi.stubGlobal("BroadcastChannel", undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ data: { user: { id: 1, email: "candidate@example.com" } } }))),
  );
  vi.stubEnv("DEV", false);
  await initializeTestI18n();
  const source = new QueryClient();
  const now = Date.now();
  const preparationId = await enableOfflineAccount({
    version: 1,
    userId: 1,
    email: "candidate@example.com",
    verifiedAt: now,
    expiresAt: now + OFFLINE_RETENTION_MS,
  });
  for (const collection of ["active", "archive", "blacklist"] as const) {
    source.setQueryData(applicationKeys.list(1, collection), { data: { applications: [] } });
  }
  await saveOfflineSnapshot(1, offlineQuerySnapshot(source, 1), preparationId);
  accountFixture = { ...(await markOfflineReady(1, "build", preparationId)), preparationId };
  source.clear();
});
afterEach(async () => {
  cleanup();
  for (const client of clients.splice(0)) {
    client.clear();
  }
  await clearOfflineDevice();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

test("Settings recovers a rejected storage read through an explicit retry", async () => {
  const client = createClient();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/settings"]}>
        <OfflineAccessProvider restoration={Promise.reject(new Error("Denied"))}>
          <OfflineControls />
          <AccessProbe />
        </OfflineAccessProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const retry = await screen.findByRole("button", { name: "Retry reading offline data" });
  expect(screen.getByText(en.offline.restorationFailed)).toBeVisible();
  expect(access.account).toBeNull();
  fireEvent.click(retry);
  await waitFor(() => expect(access.account?.preparationId).toBe(accountFixture.preparationId));
  expect(screen.queryByRole("button", { name: "Retry reading offline data" })).not.toBeInTheDocument();
  expect(screen.getByText(/Ready offline until/)).toBeVisible();
});

test("development shows a production-build explanation instead of offering preparation", () => {
  vi.stubEnv("DEV", true);
  profile.downloaded = false;
  const client = createClient();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ControlsSurface />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(
    screen.getByText(
      "Offline access requires a production build. Run a production preview to test it; it is unavailable on the development server.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Make available offline on this device" })).not.toBeInTheDocument();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  client.clear();
});

test("query creation during rendering does not synchronously update the download notice", async () => {
  const client = createClient();
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  function InitialList() {
    useQuery({
      queryKey: applicationKeys.list(1, "active"),
      queryFn: async () => ({ data: {} }),
      initialData: { data: {} },
      staleTime: Infinity,
    });
    return null;
  }
  const element = (showList: boolean) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ControlsSurface />
        {showList && <InitialList />}
      </MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(element(false));
  view.rerender(element(true));
  await screen.findByText(/Data last downloaded:/);
  expect(errors.mock.calls.filter(([message]) => String(message).includes("Cannot update a component"))).toEqual([]);
  view.unmount();
  client.clear();
});

test.each(["/settings", "/", "/archive", "/blacklist", "/applications/3"])(
  "shows the current %s download timestamp and reacts to refresh",
  async (route) => {
    const client = createClient();
    let key: readonly unknown[] = applicationKeys.list(1, "active");
    switch (route) {
      case "/applications/3":
        key = applicationKeys.detail(1, 3);
        break;
      case "/archive":
        key = applicationKeys.list(1, "archive");
        break;
      case "/blacklist":
        key = applicationKeys.list(1, "blacklist");
        break;
    }
    const first = new Date("2026-10-01T12:00:00Z").getTime();
    const next = first + 60_000;
    client.setQueryData(key, { data: {} }, { updatedAt: first });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>
          <ControlsSurface />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Data last downloaded:/).textContent).toContain(new Date(first).toLocaleString("en"));
    act(() => client.setQueryData(key, { data: {} }, { updatedAt: next }));
    await waitFor(() =>
      expect(screen.getByText(/Data last downloaded:/).textContent).toContain(new Date(next).toLocaleString("en")),
    );
    client.clear();
  },
);

test("a saved same-owner download authorizes refresh without another checkbox", () => {
  renderControls();
  expect(screen.getByRole("button", { name: "Refresh offline data" })).toBeEnabled();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Remove offline data" })).toBeEnabled();
});

test("offline access is expanded and names the disconnected section", async () => {
  profile.canMutate = false;
  renderControls();
  await waitFor(() =>
    expect(screen.getByRole("heading", { level: 2 })).toHaveAccessibleName(
      "Offline access on this device — Offline or server unavailable",
    ),
  );
  expect(screen.queryByRole("button", { expanded: false })).toBeNull();
  expect(screen.getByRole("button", { name: "Remove offline data" })).toBeVisible();
});

test.each(["offline", "unverified", "development"])("refresh cannot start when %s", async (mode) => {
  if (mode === "offline") {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  }
  if (mode === "unverified") {
    profile.canMutate = false;
  }
  if (mode === "development") {
    vi.stubEnv("DEV", true);
  }
  renderControls();
  const button = screen.queryByRole("button", { name: "Refresh offline data" });
  if (mode === "development") {
    expect(button).toBeNull();
  } else {
    expect(button).toBeInTheDocument();
    await waitFor(() => expect(button).toBeDisabled());
    fireEvent.click(button as HTMLElement);
  }
  expect(preparation).not.toHaveBeenCalled();
});

test("refresh clears readiness before starting and announces progress while pending", async () => {
  const pending = pendingPreparation();
  renderControls();
  fireEvent.click(screen.getByRole("button", { name: "Refresh offline data" }));
  await waitFor(() => expect(access.account).toBeNull());
  expect(screen.queryByText(/Ready offline until/)).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Downloading applications and public assets…");
  const callback = preparation.mock.calls[0][4] as (progress: { completed: number; total: number }) => void;
  await act(async () => callback({ completed: 2, total: 5 }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Downloaded 2 of 5 workspaces…"));
  expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  await act(async () => pending.resolve(savedAccount()));
});

test("rapid clicks start only one refresh and success restores readiness", async () => {
  const pending = pendingPreparation();
  renderControls();
  const button = screen.getByRole("button", { name: "Refresh offline data" });
  act(() => {
    button.click();
    button.click();
  });
  expect(preparation).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.getByRole("button", { name: "Remove offline data" })).toBeDisabled());
  const account = savedAccount();
  await act(async () => pending.resolve(account));
  await waitFor(() => expect(access.account).toEqual(account));
  expect(screen.getByText(/Ready offline until/)).toBeInTheDocument();
});

test("refresh keeps its focused action mounted while the download runs", async () => {
  const pending = pendingPreparation();
  renderControls();
  const button = screen.getByRole("button", { name: "Refresh offline data" });
  button.focus();
  fireEvent.click(button);
  expect(button).toBeInTheDocument();
  expect(button).toHaveFocus();
  await waitFor(() => expect(button).toHaveAttribute("aria-disabled", "true"));
  await act(async () => pending.resolve(savedAccount()));
  expect(button).toHaveFocus();
});

test("failed refresh leaves no ready download and allows retry with retained consent", async () => {
  const pending = pendingPreparation();
  renderControls();
  fireEvent.click(screen.getByRole("button", { name: "Refresh offline data" }));
  await act(async () => pending.reject(new Error("storage failed")));
  expect(screen.queryByText(/Ready offline until/)).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Offline data could not be saved or read."));
  expect(screen.getByRole("checkbox")).toBeChecked();
  expect(screen.getByRole("button", { name: "Make available offline on this device" })).toBeEnabled();
});

test("provider worker-update feedback is announced without a controls observer", async () => {
  const view = renderControls();
  expect(observeWorkerUpdate).toHaveBeenCalledTimes(1);
  const onUpdate = observeWorkerUpdate.mock.calls[0][0] as () => void;
  act(() => onUpdate());
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(en.offline.update));
  view.refresh();
  expect(observeWorkerUpdate).toHaveBeenCalledTimes(1);
});

test("a provider failure without a read owner still offers the named connection retry", () => {
  // This isolates rendering a valid selector state; lifecycle races use the real provider below.
  const state = createAccessState({ online: false });
  const retry = vi.fn(async () => {});
  const client = createClient();
  const hook = renderHook(() => useOfflineAccess(), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
  vi.spyOn(offlineAccess, "useOfflineAccess").mockReturnValue({
    ...hook.result.current,
    ...selectAccess({ ...state, download: { status: "failed" } }, Date.now()),
    retryConnection: retry,
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OfflineControls />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(screen.getByRole("status")).toHaveTextContent(en.offline.failed);
  expect(screen.queryByText(/Ready offline until/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(preparation).not.toHaveBeenCalled();
});

test.each(["initial", "refresh"])(
  "%s preparation announces failure when server access is lost but the cached auth user is unchanged",
  async (mode) => {
    profile.downloaded = mode === "refresh";
    const pending = pendingPreparation();
    const view = renderControls();
    if (mode === "initial") {
      fireEvent.click(screen.getByRole("checkbox"));
    }
    fireEvent.click(
      screen.getByRole("button", {
        name: mode === "refresh" ? "Refresh offline data" : "Make available offline on this device",
      }),
    );
    const auth = view.client.getQueryData(["auth", "me"]);
    act(() => window.dispatchEvent(new Event("xeniway:server-unavailable")));
    const assertOwner = preparation.mock.calls[0][3] as () => void;
    expect(assertOwner).toThrow("Verified online access is required");
    await act(async () => pending.reject(new Error("workspace request failed with 500")));
    expect(view.client.getQueryData(["auth", "me"])).toBe(auth);
    expect(screen.getByRole("status")).toHaveTextContent("Offline data could not be saved or read.");
    expect(screen.queryByText(/Ready offline until/)).not.toBeInTheDocument();
    expect(screen.queryByText("Downloading applications and public assets…")).not.toBeInTheDocument();
    expect(access.account).toBeNull();
    await act(async () => access.retryConnection());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Make available offline on this device" })).toBeEnabled(),
    );
  },
);

test.each(["account change", "logout", "unmount"])("pending rejection is suppressed after %s", async (change) => {
  const pending = pendingPreparation();
  const view = renderControls();
  const runtime = currentRuntime();
  fireEvent.click(screen.getByRole("button", { name: "Refresh offline data" }));
  if (change === "unmount") {
    await waitFor(() => expect(access.download.status).toBe("preparing"));
    view.unmount();
  } else {
    act(() =>
      view.client.setQueryData(["auth", "me"], {
        data: { user: change === "logout" ? null : { id: 2, email: "other@example.com" } },
      }),
    );
    await waitFor(() => expect(access.readAccountId).toBe(change === "logout" ? null : 2));
  }
  await act(async () => pending.reject(new Error("old request failed")));
  expect(runtime.getSnapshot().account).toBeNull();
  expect(runtime.getSnapshot().download.status).not.toBe("failed");
  expect(screen.queryByText(/Offline data could not be saved or read/)).not.toBeInTheDocument();
});

test("failed preparation can retry connection verification without a ready download", async () => {
  const pending = pendingPreparation();
  renderControls();
  fireEvent.click(screen.getByRole("button", { name: "Refresh offline data" }));
  act(() => window.dispatchEvent(new Event("xeniway:server-unavailable")));
  await act(async () => pending.reject(new Error("server unavailable")));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Offline data could not be saved or read."));
  const fetch = vi.mocked(globalThis.fetch);
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(access.canMutate).toBe(true));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/Ready offline until/)).not.toBeInTheDocument();
  expect(preparation).toHaveBeenCalledTimes(1);
});

test("initial preparation requires consent and clears readiness before starting", async () => {
  profile.downloaded = false;
  pendingPreparation();
  renderControls();
  const button = screen.getByRole("button", { name: "Make available offline on this device" });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(button);
  await waitFor(() => expect(access.download.status).toBe("preparing"));
  expect(preparation).toHaveBeenCalledTimes(1);
});

test.each(["account change", "logout", "unmount"])(
  "pending preparation cannot restore readiness after %s",
  async (change) => {
    const pending = pendingPreparation();
    const view = renderControls();
    const runtime = currentRuntime();
    fireEvent.click(screen.getByRole("button", { name: "Refresh offline data" }));
    const progress = preparation.mock.calls[0][4] as (value: { completed: number; total: number }) => void;
    if (change === "unmount") {
      await waitFor(() => expect(access.download.status).toBe("preparing"));
      view.unmount();
    } else {
      act(() =>
        view.client.setQueryData(["auth", "me"], {
          data: { user: change === "logout" ? null : { id: 2, email: "other@example.com" } },
        }),
      );
      await waitFor(() => expect(access.readAccountId).toBe(change === "logout" ? null : 2));
    }
    expect(() => progress({ completed: 5, total: 5 })).toThrow();
    await act(async () => {
      pending.resolve(savedAccount());
    });
    expect(runtime.getSnapshot().account).toBeNull();
    expect(runtime.getSnapshot().download.status).not.toBe("ready");
    if (change !== "unmount") {
      expect(screen.queryByText(/Ready offline until/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Downloaded 5 of 5/)).not.toBeInTheDocument();
      if (change === "account change") {
        expect(screen.getByRole("checkbox")).not.toBeChecked();
        expect(screen.getByRole("button", { name: "Make available offline on this device" })).toBeDisabled();
      }
    }
  },
);

test("auth query errors prevent refresh even when cached user data remains", async () => {
  const client = createClient();
  const auth = client.getQueryData(["auth", "me"]);
  // Mounting the real provider may recheck a stale failed query; the server remains unavailable.
  vi.mocked(globalThis.fetch).mockRejectedValue(new Error("offline"));
  await client
    .fetchQuery({
      queryKey: ["auth", "me"],
      queryFn: async () => {
        throw new Error("offline");
      },
      staleTime: 0,
    })
    .catch(() => {});
  renderControls(client);
  const button = screen.getByRole("button", { name: "Refresh offline data" });
  await waitFor(() => expect(button).toBeDisabled());
  expect(client.getQueryData(["auth", "me"])).toBe(auth);
  expect(access.canMutate).toBe(false);
  fireEvent.click(button);
  expect(preparation).not.toHaveBeenCalled();
});

test("replacement notification does not cancel the initiating tab's preparation", async () => {
  const channels = new Set<BrowserChannel>();
  class BrowserChannel {
    onmessage: ((event: MessageEvent) => void) | null = null;
    constructor() {
      channels.add(this);
    }
    postMessage(data: unknown) {
      for (const recipient of channels) {
        if (recipient !== this) {
          queueMicrotask(() => recipient.onmessage?.(new MessageEvent("message", { data })));
        }
      }
    }
    close() {
      channels.delete(this);
    }
  }
  vi.stubGlobal("BroadcastChannel", BrowserChannel);
  preparation.mockImplementation(
    async (...args: Parameters<typeof import("./prepare-offline").prepareOfflineAccount>) => {
      const notifyReplacement = args[5];
      if (notifyReplacement) {
        notifyReplacement(1);
      } else {
        const sender = new BrowserChannel();
        sender.postMessage({ type: "account-replaced", userId: 1 });
        sender.close();
      }
      await Promise.resolve();
      args[3]();
      return savedAccount();
    },
  );
  renderControls();
  fireEvent.click(screen.getByRole("button", { name: "Refresh offline data" }));
  await waitFor(() => expect(preparation).toHaveBeenCalledOnce());
  await waitFor(() => expect(access.download.status).toBe("ready"));
  expect(screen.getByText(/Ready offline until/)).toBeVisible();
});

test("a restarted runtime can prepare again after disposal cancels a pending run", async () => {
  const pending = pendingPreparation();
  const view = renderControls();
  const runtime = currentRuntime();
  fireEvent.click(screen.getByRole("button", { name: "Refresh offline data" }));
  await waitFor(() => expect(access.download.status).toBe("preparing"));
  view.unmount();
  const stop = runtime.start();
  try {
    expect(runtime.getSnapshot().download.status).toBe("absent");
    preparation.mockResolvedValue(savedAccount());
    await runtime.prepareDownload({ consent: true });
    expect(preparation).toHaveBeenCalledTimes(2);
    expect(runtime.getSnapshot().download.status).toBe("ready");
    pending.resolve(savedAccount());
    await Promise.resolve();
    expect(runtime.getSnapshot().download.status).toBe("ready");
  } finally {
    stop();
    pending.resolve(savedAccount());
  }
});

test("the existing remove action still clears offline data", async () => {
  const client = createClient();
  for (const collection of ["active", "archive", "blacklist"] as const) {
    client.setQueryData(applicationKeys.list(1, collection), { data: { applications: [] } });
  }
  renderControls(client);
  expect(await loadOfflineSnapshot(1)).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Remove offline data" }));
  await waitFor(() => expect(access.account).toBeNull());
  expect(await loadOfflineSnapshot(1)).toBeNull();
});

test("a failed removal exposes retry cleanup without restoring offline access", async () => {
  const originalIndexedDb = indexedDB;
  renderControls();
  try {
    vi.stubGlobal("indexedDB", {
      open() {
        throw new DOMException("Denied", "SecurityError");
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove offline data" }));

    expect(
      await screen.findByText(
        "Offline data removal is unfinished. Access to this download is revoked. Finish cleanup before starting a new download.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry cleanup" })).toBeVisible();
    act(() => window.dispatchEvent(new Event("offline")));
    await waitFor(() => expect(access.readAccountId).toBeNull());

    vi.stubGlobal("indexedDB", originalIndexedDb);
    fireEvent.click(screen.getByRole("button", { name: "Retry cleanup" }));

    await waitFor(() =>
      expect(
        screen.queryByText(
          "Offline data removal is unfinished. Access to this download is revoked. Finish cleanup before starting a new download.",
        ),
      ).toBeNull(),
    );
  } finally {
    vi.stubGlobal("indexedDB", originalIndexedDb);
    onlineManager.setOnline(true);
  }
});

test("Settings can retry unreadable cleanup metadata after permissions recover without another reload", async () => {
  rememberOfflineCleanup({ ownerId: 1, preparationId: accountFixture.preparationId ?? null });
  const originalGetItem = Storage.prototype.getItem;
  const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (this: Storage, key) {
    if (key === offlineCleanupStorageKey) {
      throw new DOMException("Denied", "SecurityError");
    }
    return originalGetItem.call(this, key);
  });
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  renderControls();

  expect(
    screen.getByText("Offline data cleanup status could not be read. Retry cleanup when browser storage is available."),
  ).toBeVisible();
  expect(access.readAccountId).toBeNull();
  expect(screen.queryByText(/Ready offline until/)).not.toBeInTheDocument();
  getItem.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "Retry cleanup" }));
  await waitFor(() => expect(access.cleanup.status).toBe("idle"));
  expect(access.readAccountId).toBeNull();
  expect(await loadOfflineSnapshot(1)).toBeNull();
});

test.each(["offline", "auth error", "owner mismatch"])(
  "click guards detect %s before the component rerenders",
  async (change) => {
    const view = renderControls();
    if (change === "offline") {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    }
    if (change === "owner mismatch") {
      view.client.setQueryData(["auth", "me"], { data: { user: null } });
    }
    if (change === "auth error") {
      await view.client
        .fetchQuery({
          queryKey: ["auth", "me"],
          queryFn: async () => {
            throw new Error("unavailable");
          },
          staleTime: 0,
        })
        .catch(() => {});
    }
    fireEvent.click(screen.getByRole("button", { name: "Refresh offline data" }));
    expect(preparation).not.toHaveBeenCalled();
    expect(access.download.status).not.toBe("preparing");
  },
);

test.each(["offline", "auth error", "unverified"])(
  "pending success is discarded after losing %s access",
  async (change) => {
    const pending = pendingPreparation();
    const view = renderControls();
    fireEvent.click(screen.getByRole("button", { name: "Refresh offline data" }));
    if (change === "offline") {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    }
    if (change === "unverified") {
      act(() => window.dispatchEvent(new Event("xeniway:server-unavailable")));
    }
    if (change === "auth error") {
      await act(async () => {
        await view.client
          .fetchQuery({
            queryKey: ["auth", "me"],
            queryFn: async () => {
              throw new Error("unavailable");
            },
            staleTime: 0,
          })
          .catch(() => {});
      });
    }
    await act(async () => pending.resolve(savedAccount()));
    expect(access.account).toBeNull();
    expect(screen.queryByText(/Ready offline until/)).not.toBeInTheDocument();
  },
);

test.each([
  ["en", en],
  ["ru", ru],
  ["uk", uk],
  ["he", he],
] as const)("%s has aligned offline copy and localized live progress", async (locale, dictionary) => {
  expect(Object.keys(dictionary.offline).sort()).toEqual(Object.keys(en.offline).sort());
  for (const key of ["refresh", "progress", "coverage", "refreshReplacement"] as const) {
    expect(dictionary.offline[key]).not.toBe("");
  }
  await changeLocale(locale);
  const pending = pendingPreparation();
  renderControls(createClient(), dictionary.offline.title);
  fireEvent.click(screen.getByRole("button", { name: dictionary.offline.refresh }));
  const callback = preparation.mock.calls[0][4] as (value: { completed: number; total: number }) => void;
  await act(async () => callback({ completed: 2, total: 5 }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      dictionary.offline.progress.replace("{{completed}}", "2").replace("{{total}}", "5"),
    ),
  );
  await act(async () => pending.resolve(savedAccount()));
});
