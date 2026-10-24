import "fake-indexeddb/auto";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import { createOfflineAccessRuntime, offlineAuthKey } from "./offline-access-runtime";
import { OfflinePreparationFailure } from "./offline-preparation-failure";
import { clearOfflineDevice, OfflinePreparationChangedError } from "./offline-store";
import * as preparation from "./prepare-offline";

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await clearOfflineDevice();
});

test.each(["owner change", "sign out", "stop", "disconnect"] as const)(
  "preparation guard classifies %s before a stale write guard",
  async (change) => {
    vi.stubEnv("DEV", false);
    vi.stubGlobal("BroadcastChannel", undefined);
    let resume!: () => void;
    const paused = new Promise<void>((resolve) => {
      resume = resolve;
    });
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let guardFailure: unknown;
    vi.spyOn(preparation, "prepareOfflineAccount").mockImplementation(async (_client, _user, _assets, assertOwner) => {
      assertOwner();
      entered();
      await paused;
      try {
        assertOwner();
      } catch (error) {
        guardFailure = error;
        throw error;
      }
      throw new Error("Unexpected continuation");
    });
    const client = new QueryClient();
    client.setQueryData(offlineAuthKey, { data: { user: { id: 1, email: "candidate@example.com" } } });
    const runtime = createOfflineAccessRuntime(client);
    const stop = runtime.start();
    const pending = runtime.prepareDownload({ consent: true });
    try {
      await started;
      switch (change) {
        case "owner change":
          client.setQueryData(offlineAuthKey, { data: { user: { id: 2, email: "other@example.com" } } });
          break;
        case "sign out":
          await runtime.signOutLocally();
          break;
        case "stop":
          stop();
          break;
        case "disconnect":
          window.dispatchEvent(new Event("offline"));
          break;
      }
      resume();
      await pending;
      const download = runtime.getSnapshot().download;
      if (change === "disconnect") {
        expect(download).toMatchObject({ status: "failed", category: "connection" });
        expect(guardFailure).toBeInstanceOf(OfflinePreparationFailure);
      } else {
        expect(download.status).toBe("absent");
        expect(guardFailure).toBeInstanceOf(OfflinePreparationChangedError);
      }
      expect(runtime.getSnapshot().storageError).toBe(false);
    } finally {
      resume();
      await pending;
      stop();
      client.clear();
    }
  },
);

test("a sanitized storage failure remains actionable in the current preparation", async () => {
  vi.stubEnv("DEV", false);
  vi.stubGlobal("BroadcastChannel", undefined);
  vi.spyOn(preparation, "prepareOfflineAccount").mockRejectedValue(new OfflinePreparationFailure("storage"));
  const client = new QueryClient();
  client.setQueryData(offlineAuthKey, { data: { user: { id: 1, email: "candidate@example.com" } } });
  const runtime = createOfflineAccessRuntime(client);
  const stop = runtime.start();
  try {
    await runtime.prepareDownload({ consent: true });
    expect(runtime.getSnapshot().download).toMatchObject({ status: "failed", category: "storage" });
  } finally {
    stop();
    client.clear();
  }
});
