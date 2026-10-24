import "fake-indexeddb/auto";
import { QueryClient } from "@tanstack/react-query";
import { IDBObjectStore } from "fake-indexeddb";
import { openDB } from "idb";
import { afterEach, expect, test, vi } from "vitest";
import { applicationKeys, getApplicationDetail, listApplications } from "../../lib/api";
import {
  createApplicationWorkspaceData,
  workspaceContact,
  workspaceFollowUpTask,
} from "../applications/application-workspace/test-support/application-workspace-fixtures";
import { clearOfflineAccount, loadOfflineSnapshot, restoreOfflineAccount } from "./offline-store";
import { prepareOfflineAccount } from "./prepare-offline";

afterEach(async () => {
  await clearOfflineAccount(1);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function workspace(id: number) {
  const data = createApplicationWorkspaceData();
  return {
    data: {
      ...data,
      application: { ...data.application, id },
      contacts: [{ ...workspaceContact, applicationId: id }],
      followUpTasks: [{ ...workspaceFollowUpTask, applicationId: id }],
      events: [
        {
          id: -id,
          applicationId: id,
          type: "application_created",
          title: "application created",
          description: null,
          metadata: null,
          isSystem: true,
          occurredAt: data.application.createdAt,
          createdAt: data.application.createdAt,
          updatedAt: data.application.createdAt,
        },
      ],
    },
  };
}
function path(input: RequestInfo | URL) {
  return String(input instanceof Request ? input.url : input);
}
function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });
}

test.each(["list", "detail"] as const)(
  "classifies an ordinary in-flight %s request joined by preparation",
  async (resource) => {
    let rejectRequest!: (error: Error) => void;
    const pending = new Promise<Response>((_resolve, reject) => {
      rejectRequest = reject;
    });
    const ordinaryPath = resource === "list" ? "/api/applications" : "/api/applications/3";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (path(input) === ordinaryPath) {
        return pending;
      }
      return json({ data: { applications: [workspace(3).data.application] } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const queryKey = resource === "list" ? applicationKeys.list(1, "active") : applicationKeys.detail(1, 3);
    const request = async () => (resource === "list" ? listApplications() : getApplicationDetail(3));
    // This ordinary request has no preparation-specific error wrapper.
    const ordinary = client.fetchQuery({ queryKey, queryFn: request }).catch((error: unknown) => error);
    const fetchQuery = vi.spyOn(client, "fetchQuery");
    const prepared = prepareOfflineAccount(
      client,
      { id: 1, email: "candidate@example.com" },
      async () => "build",
      () => {},
    ).catch((error: unknown) => error);
    try {
      await vi.waitFor(() =>
        expect(
          fetchQuery.mock.calls.some(([options]) => JSON.stringify(options.queryKey) === JSON.stringify(queryKey)),
        ).toBe(true),
      );
      expect(fetchMock.mock.calls.filter(([input]) => path(input) === ordinaryPath)).toHaveLength(1);
      const raw = new TypeError("private request details");
      rejectRequest(raw);
      expect(await ordinary).toBe(raw);
      const failure = await prepared;
      expect(failure).toMatchObject({ category: "connection", message: "Offline preparation could not be completed" });
      expect(String(failure)).not.toContain(raw.message);
      expect(await restoreOfflineAccount()).toBeNull();
    } finally {
      rejectRequest(new TypeError("Stopped"));
      await Promise.allSettled([ordinary, prepared]);
      client.clear();
    }
  },
);

test("preloads unique workspaces from all boards, persists their complete data, and reports progress", async () => {
  const ids = [3, 4, 5];
  const fetchRequest = vi.fn(async (input: RequestInfo | URL) => {
    const url = path(input);
    if (/\/\d+$/.test(url)) {
      return json(workspace(Number(url.split("/").at(-1))));
    }
    let id = 3;
    if (url.endsWith("/archive")) {
      id = 4;
    } else if (url.endsWith("/blacklist")) {
      id = 5;
    }
    return json({ data: { applications: [workspace(id).data.application, workspace(3).data.application] } });
  });
  vi.stubGlobal("fetch", fetchRequest);
  const client = new QueryClient();
  client.setQueryData(applicationKeys.detail(1, 99), workspace(99));
  const progress = vi.fn();
  try {
    const account = await prepareOfflineAccount(
      client,
      { id: 1, email: "candidate@example.com" },
      async () => "build-1",
      () => {},
      progress,
    );
    expect(account.ready).toBe(true);
    expect(fetchRequest).toHaveBeenCalledTimes(6);
    const saved = await loadOfflineSnapshot(1, Date.now());
    expect(
      saved?.queries
        .filter((query) => query.queryKey[2] === "detail")
        .map((query) => query.queryKey[3])
        .sort(),
    ).toEqual(ids);
    for (const id of ids) {
      expect(
        saved?.queries.find((query) => query.queryKey[2] === "detail" && query.queryKey[3] === id)?.state.data,
      ).toEqual(workspace(id));
    }
    expect(progress.mock.calls[0]).toEqual([{ completed: 0, total: 3 }]);
    expect(progress.mock.calls.at(-1)).toEqual([{ completed: 3, total: 3 }]);
    expect(client.getQueryData(applicationKeys.detail(1, 99))).toBeUndefined();
  } finally {
    client.clear();
  }
});

test("never claims readiness if a workspace fetch fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      /\/\d+$/.test(path(input))
        ? new Response(JSON.stringify({ error: { code: "INTERNAL_SERVER_ERROR", message: "failed" } }), { status: 503 })
        : json({ data: { applications: [workspace(3).data.application] } }),
    ),
  );
  const client = new QueryClient();
  try {
    await expect(
      prepareOfflineAccount(
        client,
        { id: 1, email: "candidate@example.com" },
        async () => "build-1",
        () => {},
      ),
    ).rejects.toThrow();
    expect(await restoreOfflineAccount(Date.now())).toBeNull();
  } finally {
    client.clear();
  }
});

test.each(["active", "archive", "blacklist"] as const)(
  "waits for in-flight collections before %s failure cleanup",
  async (collection) => {
    let failActive!: () => void;
    const pending: Array<() => void> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (path(input).endsWith(collection === "active" ? "/applications" : `/${collection}`)) {
          await new Promise<void>((resolve) => {
            failActive = resolve;
          });
          return new Response(JSON.stringify({ error: { code: "FAILED", message: "Collection failed" } }), {
            status: 503,
          });
        }
        await new Promise<void>((resolve) => pending.push(resolve));
        return json({ data: { applications: [] } });
      }),
    );
    const client = new QueryClient();
    let settled = false;
    const preparation = prepareOfflineAccount(
      client,
      { id: 1, email: "candidate@example.com" },
      async () => "build",
      () => {},
    ).catch((error: unknown) => {
      settled = true;
      return error;
    });
    try {
      await expect.poll(() => pending.length).toBe(2);
      failActive();
      await expect.poll(() => client.getQueryState(applicationKeys.list(1, collection))?.status).toBe("error");
      expect(settled).toBe(false);
      for (const release of pending) {
        release();
      }
      expect(await preparation).toMatchObject({
        category: "connection",
        message: "Offline preparation could not be completed",
      });
      expect(await restoreOfflineAccount()).toBeNull();
    } finally {
      failActive?.();
      for (const release of pending) {
        release();
      }
      await preparation;
      client.clear();
    }
  },
);

test("uses at most four detail requests concurrently and waits for all before readiness", async () => {
  const ids = Array.from({ length: 9 }, (_, index) => index + 1);
  const pending: Array<() => void> = [];
  let inFlight = 0;
  let maximum = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = path(input);
      if (!/\/\d+$/.test(url)) {
        return json({ data: { applications: ids.map((id) => workspace(id).data.application) } });
      }
      inFlight += 1;
      maximum = Math.max(maximum, inFlight);
      await new Promise<void>((resolve) =>
        pending.push(() => {
          inFlight -= 1;
          resolve();
        }),
      );
      return json(workspace(Number(url.split("/").at(-1))));
    }),
  );
  const client = new QueryClient();
  const progress = vi.fn();
  let settled = false;
  const preparation = prepareOfflineAccount(
    client,
    { id: 1, email: "candidate@example.com" },
    async () => "build-1",
    () => {},
    progress,
  ).finally(() => {
    settled = true;
  });
  try {
    await expect.poll(() => pending.length).toBe(4);
    expect(settled).toBe(false);
    expect(await restoreOfflineAccount(Date.now())).toBeNull();
    for (let completed = 0; completed < ids.length; completed += 1) {
      await expect.poll(() => pending.length).toBeGreaterThan(0);
      pending.shift()?.();
    }
    expect((await preparation).ready).toBe(true);
    expect(maximum).toBe(4);
    expect(progress.mock.calls.at(-1)).toEqual([{ completed: 9, total: 9 }]);
  } finally {
    while (pending.length) {
      pending.shift()?.();
    }
    await preparation.catch(() => {});
    client.clear();
  }
});

test("does not mark offline ready when assets fail", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ data: { applications: [] } }))),
  );
  const client = new QueryClient();
  await expect(
    prepareOfflineAccount(
      client,
      { id: 1, email: "candidate@example.com" },
      async () => {
        throw new Error("Assets failed");
      },
      () => {},
    ),
  ).rejects.toMatchObject({ category: "resources", message: "Offline preparation could not be completed" });
  expect(await restoreOfflineAccount(Date.now())).toBeNull();
  client.clear();
});

test("settles all workspace workers before failure cleanup and suppresses late progress", async () => {
  const pending = new Map<number, () => void>();
  const requested: number[] = [];
  const ids = [1, 2, 3, 4, 5];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = path(input);
      if (!/\/\d+$/.test(url)) {
        return json({ data: { applications: ids.map((id) => workspace(id).data.application) } });
      }
      const id = Number(url.split("/").at(-1));
      requested.push(id);
      await new Promise<void>((resolve) => pending.set(id, resolve));
      return id === 2
        ? new Response(JSON.stringify({ error: { code: "FAILED", message: "Workspace failed" } }), { status: 503 })
        : json(workspace(id));
    }),
  );
  const client = new QueryClient();
  const progress = vi.fn();
  let settled = false;
  const preparation = prepareOfflineAccount(
    client,
    { id: 1, email: "candidate@example.com" },
    async () => "build",
    () => {},
    progress,
  ).catch((error: unknown) => {
    settled = true;
    return error;
  });
  try {
    await expect.poll(() => pending.size).toBe(4);
    pending.get(2)?.();
    await expect.poll(() => client.getQueryState(applicationKeys.detail(1, 2))?.status).toBe("error");
    expect(settled).toBe(false);
    for (const release of pending.values()) {
      release();
    }
    expect(await preparation).toMatchObject({
      category: "connection",
      message: "Offline preparation could not be completed",
    });
    expect(requested).toHaveLength(4);
    expect(progress.mock.calls).toEqual([[{ completed: 0, total: 5 }]]);
    expect(await restoreOfflineAccount()).toBeNull();
  } finally {
    for (const release of pending.values()) {
      release();
    }
    await preparation;
    client.clear();
  }
});

test("a superseded preparation cannot clear a newer same-owner download", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => json({ data: { applications: [] } })),
  );
  const firstClient = new QueryClient();
  const secondClient = new QueryClient();
  let release!: () => void;
  let entered = false;
  const delayedAssets = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = prepareOfflineAccount(
    firstClient,
    { id: 1, email: "candidate@example.com" },
    async () => {
      entered = true;
      await delayedAssets;
      return "old";
    },
    () => {},
  );
  const rejected = expect(first).rejects.toThrow("superseded");
  try {
    await expect.poll(() => entered).toBe(true);
    await prepareOfflineAccount(
      secondClient,
      { id: 1, email: "candidate@example.com" },
      async () => "new",
      () => {},
    );
    release();
    await rejected;
    expect((await restoreOfflineAccount(Date.now()))?.buildId).toBe("new");
  } finally {
    release();
    await first.catch(() => {});
    firstClient.clear();
    secondClient.clear();
  }
});

test("removing device data during a workspace request prevents readiness", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      if (/\/\d+$/.test(path(input))) {
        await clearOfflineAccount(1);
        return json(workspace(3));
      }
      return json({ data: { applications: [workspace(3).data.application] } });
    }),
  );
  const client = new QueryClient();
  try {
    await expect(
      prepareOfflineAccount(
        client,
        { id: 1, email: "candidate@example.com" },
        async () => "build",
        () => {},
      ),
    ).rejects.toThrow();
    expect(await restoreOfflineAccount(Date.now())).toBeNull();
    expect(client.getQueryData(applicationKeys.detail(1, 3))).toBeUndefined();
  } finally {
    client.clear();
  }
});

test("a snapshot quota failure never claims readiness", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => json({ data: { applications: [] } })),
  );
  const put = IDBObjectStore.prototype.put;
  vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (this: IDBObjectStore, ...args) {
    if (this.name === "snapshots") {
      throw new DOMException("Full", "QuotaExceededError");
    }
    return put.apply(this, args);
  });
  const client = new QueryClient();
  try {
    await expect(
      prepareOfflineAccount(
        client,
        { id: 1, email: "candidate@example.com" },
        async () => "build",
        () => {},
      ),
    ).rejects.toMatchObject({ category: "storage", message: "Offline preparation could not be completed" });
    expect(await restoreOfflineAccount(Date.now())).toBeNull();
  } finally {
    client.clear();
  }
});

test("readiness requires assets and all three lists", async () => {
  const fetchRequest = vi.fn(async () => new Response(JSON.stringify({ data: { applications: [] } })));
  vi.stubGlobal("fetch", fetchRequest);
  const client = new QueryClient();
  const account = await prepareOfflineAccount(
    client,
    { id: 1, email: "candidate@example.com" },
    async () => "build-1",
    () => {},
  );
  expect(fetchRequest).toHaveBeenCalledTimes(3);
  expect(account.ready).toBe(true);
  expect((await restoreOfflineAccount(Date.now()))?.buildId).toBe("build-1");
  client.clear();
});

test("replacement notification failure removes the unfinished durable generation", async () => {
  const client = new QueryClient();
  const failure = new Error("Channel closed");
  try {
    await expect(
      prepareOfflineAccount(
        client,
        { id: 1, email: "candidate@example.com" },
        async () => "build",
        () => {},
        undefined,
        () => {
          throw failure;
        },
      ),
    ).rejects.toBe(failure);
    const database = await openDB("xeniway-offline", 1);
    try {
      expect(await database.getAllKeys("accounts")).toEqual([]);
    } finally {
      database.close();
    }
  } finally {
    client.clear();
  }
});

test("an account change during preparation suppresses readiness", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ data: { applications: [] } }))),
  );
  const client = new QueryClient();
  let changed = false;
  await expect(
    prepareOfflineAccount(
      client,
      { id: 1, email: "candidate@example.com" },
      async () => {
        changed = true;
        return "build-1";
      },
      () => {
        if (changed) {
          throw new Error("Account changed");
        }
      },
    ),
  ).rejects.toThrow("Account changed");
  expect(await restoreOfflineAccount(Date.now())).toBeNull();
  client.clear();
});
