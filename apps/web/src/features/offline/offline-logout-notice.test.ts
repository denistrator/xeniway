import { afterEach, expect, test, vi } from "vitest";
import { clearOfflineLogoutNotice, hasOfflineLogoutNotice, saveOfflineLogoutNotice } from "./offline-logout-notice";

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

test("an unreadable tab notice does not throw during startup", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Denied", "SecurityError");
  });
  expect(() => hasOfflineLogoutNotice()).not.toThrow();
  expect(hasOfflineLogoutNotice()).toBe(false);
});

test("saving a notice reports denied storage without throwing", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Denied", "SecurityError");
  });
  expect(() => saveOfflineLogoutNotice()).not.toThrow();
  expect(saveOfflineLogoutNotice()).toBe(false);
});

test("clearing a notice reports denied storage without throwing", () => {
  saveOfflineLogoutNotice();
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
    throw new DOMException("Denied", "SecurityError");
  });
  expect(() => clearOfflineLogoutNotice()).not.toThrow();
  expect(clearOfflineLogoutNotice()).toBe(false);
});

test("the reload marker is tab-scoped and contains no identity or session data", () => {
  expect(saveOfflineLogoutNotice()).toBe(true);
  expect(window.sessionStorage.length).toBe(1);
  expect(window.sessionStorage.getItem("xeniway.offline-logout-notice")).toBe("true");
  expect(window.localStorage.length).toBe(0);
  expect(hasOfflineLogoutNotice()).toBe(true);
  expect(clearOfflineLogoutNotice()).toBe(true);
  expect(hasOfflineLogoutNotice()).toBe(false);
});
