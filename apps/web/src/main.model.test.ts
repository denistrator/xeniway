import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { changeLocale, i18n, initializeI18n } from "./i18n/i18n";
import he from "./i18n/locales/he";
import { readLocalUserPreferences, writeLocalUserPreferences } from "./lib/user-preferences";

const { renderRoot } = vi.hoisted(() => ({ renderRoot: vi.fn() }));
vi.mock("react-dom/client", () => ({ createRoot: () => ({ render: renderRoot }) }));
const fetchDictionary = vi.fn<typeof fetch>();
beforeEach(() => {
  if (i18n.isInitialized) {
    i18n.removeResourceBundle("he", "translation");
  }
  fetchDictionary.mockReset();
  fetchDictionary.mockRejectedValue(new TypeError("private network details"));
  vi.stubGlobal("fetch", fetchDictionary);
});
afterEach(() => vi.unstubAllGlobals());
vi.mock("./features/offline/offline-store", () => ({
  restoreOfflineAccount: async () => null,
  loadOfflineSnapshot: async () => null,
}));

test("bootstrap renders with bundled English after a rejected startup dictionary fetch", async () => {
  const root = document.createElement("div");
  root.id = "root";
  document.body.append(root);
  writeLocalUserPreferences({ language: "he" });
  const { bootstrap } = await import("./main.model");
  await bootstrap(() => "Application rendered");
  expect(renderRoot).toHaveBeenCalledWith("Application rendered");
  expect(i18n.resolvedLanguage).toBe("en");
  expect(document.documentElement.lang).toBe("en");
  expect(document.documentElement.dir).toBe("ltr");
  expect(readLocalUserPreferences().language).toBe("he");
  root.remove();
});

test("an explicit startup retry fetches again and can activate the stored language", async () => {
  writeLocalUserPreferences({ language: "he" });
  await initializeI18n();
  expect(i18n.resolvedLanguage).toBe("en");
  expect(document.documentElement.lang).toBe("en");
  expect(document.documentElement.dir).toBe("ltr");
  expect(readLocalUserPreferences().language).toBe("he");
  fetchDictionary.mockResolvedValue(
    new Response(JSON.stringify(he), { headers: { "content-type": "application/json" } }),
  );
  await changeLocale("he");
  expect(fetchDictionary).toHaveBeenCalledTimes(2);
  expect(i18n.resolvedLanguage).toBe("he");
  expect(document.documentElement.lang).toBe("he");
  expect(document.documentElement.dir).toBe("rtl");
});
