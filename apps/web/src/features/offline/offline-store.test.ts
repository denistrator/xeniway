import "fake-indexeddb/auto";
import { type DehydratedState, dehydrate, QueryClient } from "@tanstack/react-query";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { openDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApplicationWorkspaceData,
  workspaceContact,
  workspaceFollowUpTask,
} from "../applications/application-workspace/test-support/application-workspace-fixtures";
import { finishOfflineCleanup, readOfflineCleanup, rememberOfflineCleanup } from "./offline-cleanup";
import { deriveOfflineSnapshot, validateStoredSnapshot } from "./offline-snapshot-validation";
import {
  clearOfflineAccount,
  clearOfflineDevice,
  enableOfflineAccount,
  loadOfflineSnapshot,
  markOfflineReady,
  restoreOfflineAccount,
  saveOfflineSnapshot,
} from "./offline-store";
import { OFFLINE_RETENTION_MS, type OfflineAccountRecord } from "./offline-types";

const now = Date.parse("2026-10-06T12:00:00Z");
const detail = { data: createApplicationWorkspaceData() };
const list = { data: { applications: [detail.data.application] } };
function account(userId = 1): OfflineAccountRecord {
  return {
    version: 1,
    userId,
    email: `user${userId}@example.com`,
    verifiedAt: now,
    expiresAt: now + OFFLINE_RETENTION_MS,
  };
}
function snapshot(userId = 1): DehydratedState {
  const client = new QueryClient();
  for (const name of ["active", "archive", "blacklist"]) {
    client.setQueryData(["applications", userId, "list", name], list);
  }
  client.setQueryData(["applications", userId, "detail", 3], detail);
  return dehydrate(client);
}
async function prepare(userId = 1) {
  await enableOfflineAccount(account(userId));
  await saveOfflineSnapshot(userId, snapshot(userId));
  await markOfflineReady(userId, "build-1");
}
async function tamper(store: "accounts" | "snapshots", key: string | number, value: unknown) {
  const db = await openDB("xeniway-offline", 1);
  try {
    await db.put(store, value, key);
  } finally {
    db.close();
  }
}

beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.spyOn(Date, "now").mockReturnValue(now);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("offline durable storage", () => {
  it("keeps a pending removal unreadable across connections and blocks a new download", async () => {
    await prepare();
    const ready = await restoreOfflineAccount(now);
    const target = { ownerId: 1, preparationId: ready?.preparationId ?? null };
    rememberOfflineCleanup(target);

    expect(readOfflineCleanup()).toEqual(target);
    expect(await restoreOfflineAccount(now)).toBeNull();
    expect(await loadOfflineSnapshot(1, now)).toBeNull();
    await expect(enableOfflineAccount(account(2))).rejects.toThrow(/cleanup/i);
    await expect(saveOfflineSnapshot(1, snapshot())).rejects.toThrow(/cleanup/i);
    await expect(markOfflineReady(1, "build-2")).rejects.toThrow(/cleanup/i);

    await clearOfflineAccount(1, target.preparationId);
    finishOfflineCleanup(target);
    expect(readOfflineCleanup()).toBeNull();
    expect(await restoreOfflineAccount(now)).toBeNull();
    await expect(enableOfflineAccount(account(2))).resolves.toBeTypeOf("string");
  });

  it("an old cleanup retry cannot remove a newer owner's download or marker", async () => {
    await prepare(2);
    const ready = await restoreOfflineAccount(now);
    const oldTarget = { ownerId: 1, preparationId: "old-generation" };
    const newTarget = { ownerId: 2, preparationId: ready?.preparationId ?? null };
    rememberOfflineCleanup(newTarget);

    expect(await clearOfflineAccount(1, oldTarget.preparationId)).toBe(false);
    finishOfflineCleanup(oldTarget);
    expect(readOfflineCleanup()).toEqual(newTarget);
    finishOfflineCleanup(newTarget);
    expect(await restoreOfflineAccount(now)).toMatchObject({ userId: 2, ready: true });
  });

  it("logout removes pending-cleanup metadata together with the private download", async () => {
    await prepare();
    rememberOfflineCleanup({ ownerId: 1, preparationId: null });
    await clearOfflineDevice();
    expect(readOfflineCleanup()).toBeNull();
    expect(await restoreOfflineAccount(now)).toBeNull();
  });

  it("unreadable cleanup metadata cannot block device-wide private-data erasure", async () => {
    await prepare();
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });
    await expect(clearOfflineDevice()).resolves.toBeUndefined();
    getItem.mockRestore();
    expect(await restoreOfflineAccount(now)).toBeNull();
  });

  it.each([
    "duplicate",
    "foreign-owner",
    "extra-query-field",
    "extra-state-field",
    "future-update",
    "pending-fetch",
    "invalidated",
    "mutation",
    "extra-snapshot-field",
  ])("strictly rejects stored snapshot corruption: %s", async (corruption) => {
    await prepare();
    const canonical = deriveOfflineSnapshot(1, snapshot(), now);
    const query = canonical.queries[0];
    const corruptions = {
      duplicate: () => canonical.queries.push(structuredClone(query)),
      "foreign-owner": () => {
        query.queryKey = ["applications", 2, "list", "active"];
      },
      "extra-query-field": () => Object.assign(query, { meta: { secret: "token" } }),
      "extra-state-field": () => Object.assign(query.state, { secret: "token" }),
      "future-update": () => {
        query.state.dataUpdatedAt = now + 1;
      },
      "pending-fetch": () => {
        query.state.fetchStatus = "fetching";
      },
      invalidated: () => {
        query.state.isInvalidated = true;
      },
      mutation: () => Object.assign(canonical, { mutations: [{ secret: "token" }] }),
      "extra-snapshot-field": () => Object.assign(canonical, { secret: "token" }),
    };
    corruptions[corruption as keyof typeof corruptions]();
    expect(validateStoredSnapshot(1, canonical, now)).toBeNull();
    await tamper("snapshots", 1, { version: 1, userId: 1, savedAt: now, snapshot: canonical });
    expect(await loadOfflineSnapshot(1, now)).toBeNull();
    expect(await restoreOfflineAccount(now)).toBeNull();
  });
  it.each([
    { id: -4 },
    { type: "note" },
    { title: "Created" },
    { isSystem: false },
    { description: "text" },
    { createdAt: "2026-10-02T00:00:00Z" },
  ])("rejects forged synthetic creation markers: %j", async (patch) => {
    await enableOfflineAccount(account());
    const state = snapshot();
    const timestamp = detail.data.application.createdAt;
    state.queries[3].state.data = {
      data: {
        ...detail.data,
        events: [
          {
            id: -3,
            applicationId: 3,
            type: "application_created",
            title: "application created",
            description: null,
            metadata: null,
            isSystem: true,
            occurredAt: timestamp,
            createdAt: timestamp,
            updatedAt: timestamp,
            ...patch,
          },
        ],
      },
    };
    await expect(saveOfflineSnapshot(1, state)).rejects.toThrow("Invalid offline application response");
  });
  it("guards superseded same-owner preparations and their failure cleanup", async () => {
    const first = await enableOfflineAccount(account());
    const second = await enableOfflineAccount(account());
    expect(first).toBeTypeOf("string");
    expect(second).not.toBe(first);
    await expect(saveOfflineSnapshot(1, snapshot(), first)).rejects.toThrow("superseded");
    await saveOfflineSnapshot(1, snapshot(), second);
    await expect(markOfflineReady(1, "old-build", first)).rejects.toThrow("superseded");
    await clearOfflineAccount(1, first);
    await markOfflineReady(1, "new-build", second);
    expect((await restoreOfflineAccount(now))?.buildId).toBe("new-build");
  });
  it("cannot finish a preparation after device data is removed", async () => {
    const generation = await enableOfflineAccount(account());
    await clearOfflineAccount(1);
    await expect(saveOfflineSnapshot(1, snapshot(), generation)).rejects.toThrow();
    await expect(markOfflineReady(1, "build", generation)).rejects.toThrow();
    expect(await restoreOfflineAccount(now)).toBeNull();
  });
  it("requires every listed workspace before completing a new preparation", async () => {
    const generation = await enableOfflineAccount(account());
    const listsOnly = snapshot();
    listsOnly.queries = listsOnly.queries.filter((query) => query.queryKey[2] === "list");
    await saveOfflineSnapshot(1, listsOnly, generation);
    await expect(markOfflineReady(1, "build", generation)).rejects.toThrow("workspaces");
    expect(await restoreOfflineAccount(now)).toBeNull();
  });
  it("rejects automatic persistence from an older saved preparation", async () => {
    await prepare();
    const old = await restoreOfflineAccount(now);
    expect(old?.preparationId).toBeTypeOf("string");
    const current = await enableOfflineAccount(account());
    await saveOfflineSnapshot(1, snapshot(), current);
    await markOfflineReady(1, "refreshed", current);
    const listsOnly = snapshot();
    listsOnly.queries = listsOnly.queries.filter((query) => query.queryKey[2] === "list");
    await expect(saveOfflineSnapshot(1, listsOnly, old?.preparationId ?? null)).rejects.toThrow("superseded");
    expect((await loadOfflineSnapshot(1, now))?.queries.some((query) => query.queryKey[2] === "detail")).toBe(true);
  });
  it("an old expiry cleanup cannot remove a refreshed or first-generation download", async () => {
    const old = await enableOfflineAccount(account());
    const current = await enableOfflineAccount(account());
    await saveOfflineSnapshot(1, snapshot(), current);
    await markOfflineReady(1, "refreshed", current);
    expect(await clearOfflineAccount(1, old)).toBe(false);
    expect(await clearOfflineAccount(1, null)).toBe(false);
    expect((await restoreOfflineAccount(now))?.buildId).toBe("refreshed");
  });
  it("does not let legacy no-generation persistence overwrite a new full download", async () => {
    const current = await enableOfflineAccount(account());
    await saveOfflineSnapshot(1, snapshot(), current);
    await markOfflineReady(1, "refreshed", current);
    await expect(saveOfflineSnapshot(1, snapshot(), null)).rejects.toThrow("superseded");
    expect((await restoreOfflineAccount(now))?.buildId).toBe("refreshed");
  });
  it("retains the API's derived creation marker for legacy applications", async () => {
    await enableOfflineAccount(account());
    const state = snapshot();
    const query = state.queries.find((query) => query.queryKey[2] === "detail");
    const data = structuredClone(detail);
    data.data.events = [
      {
        id: -3,
        applicationId: 3,
        type: "application_created",
        title: "application created",
        description: null,
        occurredAt: data.data.application.createdAt,
        createdAt: data.data.application.createdAt,
        updatedAt: data.data.application.createdAt,
        metadata: null,
        isSystem: true,
      },
    ];
    if (!query) {
      throw new Error("Missing fixture detail");
    }
    query.state.data = data;
    await saveOfflineSnapshot(1, state);
    await markOfflineReady(1, "build-1");
    expect(
      (await loadOfflineSnapshot(1, now))?.queries.find((query) => query.queryKey[2] === "detail")?.state.data,
    ).toEqual(data);
  });
  it("persists ready accounts and snapshots across independent connections", async () => {
    await prepare();
    expect(await restoreOfflineAccount(now)).toMatchObject({ ...account(), ready: true, buildId: "build-1" });
    expect(await loadOfflineSnapshot(1, now)).toEqual(snapshot());
    expect(await loadOfflineSnapshot(2, now)).toBeNull();
  });
  it.each(["restore", "load"] as const)(
    "%s preserves a snapshot written while the reader is opening storage",
    async (entrypoint) => {
      await prepare();
      const updated = snapshot();
      const writing = saveOfflineSnapshot(1, updated);
      const reading = entrypoint === "restore" ? restoreOfflineAccount() : loadOfflineSnapshot(1);
      vi.mocked(Date.now).mockReturnValue(now + 20);
      await writing;
      const expected = {
        ...updated,
        queries: updated.queries.map((query) => ({ ...query, dehydratedAt: now + 20 })),
      };

      if (entrypoint === "restore") {
        expect(await reading).toMatchObject({ userId: 1, ready: true, buildId: "build-1" });
      } else {
        expect(await reading).toEqual(expected);
      }
      expect(await restoreOfflineAccount(now + 20)).toMatchObject({ ready: true, buildId: "build-1" });
      expect(await loadOfflineSnapshot(1, now + 20)).toEqual(expected);
    },
  );
  it("does not expose partially prepared data", async () => {
    await enableOfflineAccount(account());
    await saveOfflineSnapshot(1, snapshot());
    expect(await restoreOfflineAccount(now)).toBeNull();
    expect(await loadOfflineSnapshot(1, now)).toBeNull();
  });
  it("requires all three lists and a build ID before marking readiness", async () => {
    await enableOfflineAccount(account());
    await expect(markOfflineReady(1, "build-1")).rejects.toThrow();
    const partial = snapshot();
    partial.queries = partial.queries.slice(0, 1);
    await saveOfflineSnapshot(1, partial);
    await expect(markOfflineReady(1, "build-1")).rejects.toThrow();
    await saveOfflineSnapshot(1, snapshot());
    await expect(markOfflineReady(1, "")).rejects.toThrow();
    expect(await restoreOfflineAccount(now)).toBeNull();
  });
  it("retains verification expiry when saving fresh snapshots or updating readiness", async () => {
    await prepare();
    vi.mocked(Date.now).mockReturnValue(now + 1000);
    await saveOfflineSnapshot(1, snapshot());
    await markOfflineReady(1, "build-2");
    expect(await restoreOfflineAccount(now + 1000)).toMatchObject({ ...account(), ready: true, buildId: "build-2" });
  });
  it("removes expired account and snapshots at the exact retention boundary", async () => {
    await prepare();
    expect(await restoreOfflineAccount(account().expiresAt)).toBeNull();
    expect(await loadOfflineSnapshot(1, now)).toBeNull();
    await expect(saveOfflineSnapshot(1, snapshot())).rejects.toThrow();
  });
  it("checks expiry on snapshot access and every write", async () => {
    await prepare();
    vi.mocked(Date.now).mockReturnValue(account().expiresAt);
    await expect(saveOfflineSnapshot(1, snapshot())).rejects.toThrow();
    await expect(markOfflineReady(1, "build-2")).rejects.toThrow();
    expect(await loadOfflineSnapshot(1, account().expiresAt)).toBeNull();
  });
  it("clears prior owner data and rejects old-account late writes and cleanup", async () => {
    await prepare();
    await prepare(2);
    await expect(saveOfflineSnapshot(1, snapshot())).rejects.toThrow();
    await expect(markOfflineReady(1, "old-build")).rejects.toThrow();
    await clearOfflineAccount(1);
    expect(await loadOfflineSnapshot(1, now)).toBeNull();
    expect(await restoreOfflineAccount(now)).toMatchObject({ userId: 2 });
    const db = await openDB("xeniway-offline", 1);
    try {
      expect(await db.get("snapshots", 1)).toBeUndefined();
    } finally {
      db.close();
    }
  });
  it("checks identity atomically when a switch and a late response race", async () => {
    await prepare();
    const switched = enableOfflineAccount(account(2));
    const late = saveOfflineSnapshot(1, snapshot());
    await switched;
    await expect(late).rejects.toThrow();
    expect(await loadOfflineSnapshot(1, now)).toBeNull();
  });
  it("disabled accounts cannot receive late responses", async () => {
    await prepare();
    await clearOfflineAccount(1);
    await clearOfflineAccount(1);
    await expect(saveOfflineSnapshot(1, snapshot())).rejects.toThrow();
    expect(await restoreOfflineAccount(now)).toBeNull();
  });
  it("excludes mutations, auth, CSRF, preferences, old keys, other owners and unsuccessful queries", async () => {
    await enableOfflineAccount(account());
    const client = new QueryClient();
    for (const key of [
      ["auth"],
      ["csrf"],
      ["preferences", 1],
      ["applications", "list", "active"],
      ["applications", 2, "list", "active"],
      ["applications", 1, "events", 3],
    ]) {
      client.setQueryData(key, { secret: "private-token" });
    }
    const state = snapshot();
    const failed = {
      ...state.queries[0],
      state: { ...state.queries[0].state, status: "error" as const, error: new Error("private-token") },
    };
    state.queries.push(...dehydrate(client).queries, failed);
    state.mutations = [
      {
        mutationKey: ["auth"],
        state: {
          context: "private-token",
          data: undefined,
          error: null,
          failureCount: 0,
          failureReason: null,
          isPaused: true,
          status: "pending",
          submittedAt: now,
          variables: { password: "private-token" },
        },
      },
    ];
    state.queries[0].meta = { csrf: "private-token" };
    await saveOfflineSnapshot(1, state);
    await markOfflineReady(1, "build-1");
    const loaded = await loadOfflineSnapshot(1, now);
    expect(loaded?.queries).toHaveLength(4);
    expect(loaded?.mutations).toEqual([]);
    expect(JSON.stringify(loaded)).not.toContain("private-token");
  });
  it.each([
    { userId: 0 },
    { version: 2 },
    { email: "bad" },
    { verifiedAt: now + 1 },
    { expiresAt: now },
    { expiresAt: now + OFFLINE_RETENTION_MS + 1 },
    { csrfToken: "secret" },
  ])("rejects malformed opt-in records: %j", async (patch) => {
    await expect(enableOfflineAccount({ ...account(), ...patch } as OfflineAccountRecord)).rejects.toThrow();
  });
  it.each([
    null,
    { version: 9 },
    { ...account(), ready: true, buildId: null },
    { ...account(), ready: true, buildId: "build", csrfToken: "secret" },
  ])("removes corrupt stored account %j", async (value) => {
    await prepare();
    await tamper("accounts", "active", value);
    expect(await restoreOfflineAccount(now)).toBeNull();
    expect(await loadOfflineSnapshot(1, now)).toBeNull();
  });
  it.each([
    { data: { applications: [{ id: 3 }] } },
    { ...list, csrfToken: "secret" },
    { data: { applications: [{ ...detail.data.application, status: "unknown" }] } },
    { data: { applications: [{ ...detail.data.application, createdAt: "bad" }] } },
  ])("rejects incomplete or unknown list response shapes: %j", async (data) => {
    await enableOfflineAccount(account());
    const state = snapshot();
    state.queries[0].state.data = data;
    await expect(saveOfflineSnapshot(1, state)).rejects.toThrow();
    expect(await restoreOfflineAccount(now)).toBeNull();
  });
  it.each([
    { data: { application: detail.data.application } },
    { data: { ...detail.data, application: { ...detail.data.application, id: 4 } } },
    { data: { ...detail.data, contacts: [{ id: 1 }] } },
    { data: { ...detail.data, preparation: { ...detail.data.preparation, secret: "token" } } },
    { data: { ...detail.data, events: [{ id: 1 }] } },
    { data: { ...detail.data, followUpTasks: [{ id: 1 }] } },
  ])("rejects incomplete/mismatched detail responses: %j", async (data) => {
    await enableOfflineAccount(account());
    const state = snapshot();
    state.queries[3].state.data = data;
    await expect(saveOfflineSnapshot(1, state)).rejects.toThrow();
  });
  it("removes corrupt snapshots and revokes readiness", async () => {
    await prepare();
    await tamper("snapshots", 1, {
      version: 1,
      userId: 1,
      savedAt: now,
      snapshot: { mutations: [], queries: [{ queryKey: ["auth"] }] },
    });
    expect(await loadOfflineSnapshot(1, now)).toBeNull();
    expect(await restoreOfflineAccount(now)).toBeNull();
  });
  it("propagates denied storage without a fallback", async () => {
    const error = new DOMException("Storage denied", "SecurityError");
    vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw error;
    });
    await expect(enableOfflineAccount(account())).rejects.toBe(error);
    await expect(restoreOfflineAccount(now)).rejects.toBe(error);
    await expect(loadOfflineSnapshot(1, now)).rejects.toBe(error);
    await expect(clearOfflineAccount(1)).rejects.toBe(error);
  });
  it("retries storage after a rejected open without losing the existing download", async () => {
    await prepare();
    const error = new DOMException("Storage denied", "SecurityError");
    vi.spyOn(indexedDB, "open").mockImplementationOnce(() => {
      throw error;
    });
    await expect(restoreOfflineAccount(now)).rejects.toBe(error);
    expect(await restoreOfflineAccount(now)).toMatchObject({ userId: 1, ready: true });
    expect(await loadOfflineSnapshot(1, now)).toEqual(snapshot());
  });
  it("propagates quota errors and leaves the prior snapshot intact", async () => {
    await prepare();
    const previous = await loadOfflineSnapshot(1, now);
    const error = new DOMException("Quota exhausted", "QuotaExceededError");
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw error;
    });
    await expect(saveOfflineSnapshot(1, snapshot())).rejects.toBe(error);
    vi.restoreAllMocks();
    expect(await loadOfflineSnapshot(1, now)).toEqual(previous);
  });
  it("round-trips complete workspace contacts, activity, preparation, and follow-ups", async () => {
    await enableOfflineAccount(account());
    const state = snapshot();
    const data = {
      data: createApplicationWorkspaceData({
        contacts: [workspaceContact],
        followUpTasks: [workspaceFollowUpTask],
        events: [
          {
            id: 9,
            applicationId: 3,
            type: "status_changed",
            title: "Status changed",
            description: null,
            occurredAt: "2026-10-01T00:00:00Z",
            createdAt: "2026-10-01T00:00:00Z",
            updatedAt: "2026-10-01T00:00:00Z",
            metadata: { from: "saved", to: "applied" },
            isSystem: true,
          },
        ],
      }),
    };
    state.queries[3].state.data = data;
    await saveOfflineSnapshot(1, state);
    await markOfflineReady(1, "build-1");
    expect((await loadOfflineSnapshot(1, now))?.queries[3].state.data).toEqual(data);
  });
  it.each(["events", "contacts", "followUpTasks"] as const)("rejects foreign-application %s records", async (field) => {
    await enableOfflineAccount(account());
    const state = snapshot();
    const children = {
      contacts: [workspaceContact],
      followUpTasks: [workspaceFollowUpTask],
      events: [
        {
          id: 9,
          applicationId: 3,
          type: "note",
          title: "Note",
          description: null,
          occurredAt: "2026-10-01T00:00:00Z",
          createdAt: "2026-10-01T00:00:00Z",
          updatedAt: "2026-10-01T00:00:00Z",
          metadata: null,
          isSystem: false,
        },
      ],
    };
    state.queries[3].state.data = { data: { ...detail.data, [field]: [{ ...children[field][0], applicationId: 4 }] } };
    await expect(saveOfflineSnapshot(1, state)).rejects.toThrow();
  });
  it.each(["version", "userId", "savedAt", "snapshot"])("removes snapshots missing %s", async (field) => {
    await prepare();
    const stored: Record<string, unknown> = { version: 1, userId: 1, savedAt: now, snapshot: snapshot() };
    delete stored[field];
    await tamper("snapshots", 1, stored);
    expect(await loadOfflineSnapshot(1, now)).toBeNull();
    expect(await restoreOfflineAccount(now)).toBeNull();
  });
  it.each([
    { version: 2 },
    { userId: 2 },
    { savedAt: now + 1 },
    { savedAt: now - 1 },
    { auth: "token" },
    { snapshot: { queries: [], mutations: [{ password: "token" }] } },
  ])("removes invalid snapshot metadata %j", async (patch) => {
    await prepare();
    await tamper("snapshots", 1, { version: 1, userId: 1, savedAt: now, snapshot: snapshot(), ...patch });
    expect(await restoreOfflineAccount(now)).toBeNull();
    expect(await loadOfflineSnapshot(1, now)).toBeNull();
  });
  it("rejects canonical snapshot query hashes that do not match their owner key", async () => {
    await prepare();
    const state = snapshot();
    state.queries[0].queryHash = '["auth"]';
    await tamper("snapshots", 1, { version: 1, userId: 1, savedAt: now, snapshot: state });
    expect(await loadOfflineSnapshot(1, now)).toBeNull();
  });
  it("preserves existing ready data after a failed replacement opt-in transaction", async () => {
    await prepare();
    const error = new DOMException("Quota exhausted", "QuotaExceededError");
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw error;
    });
    await expect(enableOfflineAccount(account(2))).rejects.toBe(error);
    vi.restoreAllMocks();
    expect(await restoreOfflineAccount(now)).toMatchObject({ userId: 1, ready: true });
  });
  it("re-enabling the same account resets readiness and clears previous snapshots", async () => {
    await prepare();
    await enableOfflineAccount(account());
    expect(await restoreOfflineAccount(now)).toBeNull();
    await expect(markOfflineReady(1, "new-build")).rejects.toThrow();
  });
});
