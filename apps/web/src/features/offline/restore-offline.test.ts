import { afterEach, expect, test, vi } from "vitest";
import { restoreOfflineData } from "./restore-offline";

const storage = vi.hoisted(() => ({ account: vi.fn(), snapshot: vi.fn() }));
vi.mock("./offline-store", () => ({
  restoreOfflineAccount: storage.account,
  loadOfflineSnapshot: storage.snapshot,
}));
afterEach(() => vi.resetAllMocks());

const account = { userId: 1, preparationId: "first", expiresAt: Date.now() + 60_000 };
const snapshot = { queries: [], mutations: [] };

test("absent storage does not attempt to load private records", async () => {
  storage.account.mockResolvedValue(null);
  expect(await restoreOfflineData()).toBeNull();
  expect(storage.snapshot).not.toHaveBeenCalled();
});

test("storage failure remains distinguishable from absence", async () => {
  storage.account.mockRejectedValue(new Error("Denied"));
  await expect(restoreOfflineData()).rejects.toThrow("Denied");
});

test("a replacement generation during snapshot reading cannot be restored", async () => {
  storage.account.mockResolvedValueOnce(account).mockResolvedValueOnce({ ...account, preparationId: "second" });
  storage.snapshot.mockResolvedValue(snapshot);
  expect(await restoreOfflineData()).toBeNull();
});

test("a current ready download returns its snapshot", async () => {
  storage.account.mockResolvedValue(account);
  storage.snapshot.mockResolvedValue(snapshot);
  expect(await restoreOfflineData()).toEqual({ account, snapshot });
});
