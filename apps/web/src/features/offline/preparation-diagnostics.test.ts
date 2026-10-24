import "fake-indexeddb/auto";
import { QueryClient } from "@tanstack/react-query";
import { IDBObjectStore } from "fake-indexeddb";
import { afterEach, expect, test, vi } from "vitest";
import { clearOfflineDevice, OfflinePreparationChangedError, restoreOfflineAccount } from "./offline-store";
import { prepareOfflineAccount } from "./prepare-offline";

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await clearOfflineDevice();
});

test.each(["resources", "connection", "storage"] as const)(
  "reports a sanitized %s preparation failure and never claims readiness",
  async (category) => {
    const raw = "private payload session=secret candidate@example.com";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        if (category === "connection") {
          return new Response(JSON.stringify({ error: { code: "FAILED", message: raw } }), { status: 503 });
        }
        return new Response(JSON.stringify({ data: { applications: [] } }));
      }),
    );
    const originalPut = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (this: IDBObjectStore, ...args) {
      if (category === "storage" && this.name === "snapshots") {
        throw new DOMException(raw, "QuotaExceededError");
      }
      return originalPut.apply(this, args);
    });
    const client = new QueryClient();
    try {
      const failure = await prepareOfflineAccount(
        client,
        { id: 1, email: "candidate@example.com" },
        async () => {
          if (category === "resources") {
            throw new Error(raw);
          }
          return "build";
        },
        () => {},
      ).catch((error: unknown) => error);
      expect(failure).toMatchObject({ category, message: "Offline preparation could not be completed" });
      expect(String(failure)).not.toContain(raw);
      expect(JSON.stringify(failure)).not.toContain(raw);
      expect(await restoreOfflineAccount()).toBeNull();
    } finally {
      client.clear();
    }
  },
);

test("a superseded owner check remains cancellation rather than an actionable preparation category", async () => {
  const cancelled = new OfflinePreparationChangedError();
  const client = new QueryClient();
  let changed = false;
  try {
    const result = await prepareOfflineAccount(
      client,
      { id: 1, email: "candidate@example.com" },
      async () => {
        changed = true;
        return "old";
      },
      () => {
        if (changed) {
          throw cancelled;
        }
      },
    ).catch((error: unknown) => error);
    expect(result).toBe(cancelled);
    expect(result).not.toHaveProperty("category");
  } finally {
    client.clear();
  }
});

test("a genuine cleanup write failure supersedes cancellation with a sanitized storage category", async () => {
  const client = new QueryClient();
  const originalDelete = IDBObjectStore.prototype.delete;
  vi.spyOn(IDBObjectStore.prototype, "delete").mockImplementation(function (this: IDBObjectStore, ...args) {
    if (this.name === "snapshots") {
      throw new DOMException("private cleanup details", "SecurityError");
    }
    return originalDelete.apply(this, args);
  });
  try {
    const result = await prepareOfflineAccount(
      client,
      { id: 1, email: "candidate@example.com" },
      async () => {
        throw new OfflinePreparationChangedError();
      },
      () => {},
    ).catch((error: unknown) => error);
    expect(result).toMatchObject({ category: "storage", message: "Offline preparation could not be completed" });
    expect(result).not.toBeInstanceOf(OfflinePreparationChangedError);
    expect(String(result)).not.toContain("private cleanup details");
  } finally {
    client.clear();
  }
});
