import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { readLocalUserPreferences } from "../lib/user-preferences";
import { initializeTestI18n } from "../test/initialize-test-i18n";
import { changeLocale, i18n } from "./i18n";
import he from "./locales/he";

const fetchDictionary = vi.fn<typeof fetch>();
const jsonResponse = (value: unknown = he) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });

beforeEach(async () => {
  await initializeTestI18n();
  for (const locale of ["he", "ru", "uk"]) {
    i18n.removeResourceBundle(locale, "translation");
  }
  fetchDictionary.mockReset();
  fetchDictionary.mockResolvedValue(jsonResponse());
  vi.stubGlobal("fetch", fetchDictionary);
});

afterEach(() => vi.unstubAllGlobals());

test("bundled English needs no dictionary fetch", async () => {
  await changeLocale("en");
  expect(fetchDictionary).not.toHaveBeenCalled();
});

test("selecting a lazy locale fetches its same-origin JSON asset without credentials", async () => {
  await changeLocale("he");
  expect(fetchDictionary).toHaveBeenCalledOnce();
  const [input, options] = fetchDictionary.mock.calls[0];
  const url = new URL(String(input));
  expect(url.origin).toBe(window.location.origin);
  expect(url.pathname).toMatch(/\/he(?:-[\w-]+)?\.json$/);
  expect(options).toMatchObject({ credentials: "omit", mode: "same-origin", redirect: "error" });
  expect(i18n.resolvedLanguage).toBe("he");
});

test("a failed network load can be explicitly retried at the same URL", async () => {
  fetchDictionary.mockRejectedValueOnce(new TypeError("private network details"));
  await expect(changeLocale("he")).rejects.toThrow("The language resources could not be loaded");
  expect(i18n.resolvedLanguage).toBe("en");
  expect(document.documentElement.lang).toBe("en");
  expect(document.documentElement.dir).toBe("ltr");
  expect(readLocalUserPreferences().language).toBe("en");
  await changeLocale("he");
  expect(fetchDictionary).toHaveBeenCalledTimes(2);
  expect(String(fetchDictionary.mock.calls[0][0])).toBe(String(fetchDictionary.mock.calls[1][0]));
  expect(i18n.resolvedLanguage).toBe("he");
  expect(document.documentElement.dir).toBe("rtl");
});

test("concurrent locale requests share a download while only the latest choice activates", async () => {
  let complete!: (response: Response) => void;
  fetchDictionary.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  const first = changeLocale("he");
  const latest = changeLocale("he");
  complete(jsonResponse());
  expect(await first).toBe(false);
  expect(await latest).toBe(true);
  expect(fetchDictionary).toHaveBeenCalledOnce();
  expect(i18n.resolvedLanguage).toBe("he");
  expect(document.documentElement.dir).toBe("rtl");
});

test("a shared failed download is discarded so explicit Retry performs a fresh fetch", async () => {
  fetchDictionary.mockRejectedValueOnce(new TypeError("unavailable"));
  const outcomes = await Promise.allSettled([changeLocale("he"), changeLocale("he")]);
  expect(fetchDictionary).toHaveBeenCalledOnce();
  expect(outcomes[0]).toEqual({ status: "fulfilled", value: false });
  expect(outcomes[1]).toMatchObject({
    status: "rejected",
    reason: new Error("The language resources could not be loaded"),
  });
  expect(i18n.resolvedLanguage).toBe("en");
  await changeLocale("he");
  expect(fetchDictionary).toHaveBeenCalledTimes(2);
  expect(String(fetchDictionary.mock.calls[0][0])).toBe(String(fetchDictionary.mock.calls[1][0]));
  expect(i18n.resolvedLanguage).toBe("he");
});

test.each([
  ["HTTP error", () => new Response("unavailable", { status: 503 })],
  ["HTML fallback", () => new Response("<html></html>", { headers: { "content-type": "text/html" } })],
  ["invalid JSON", () => new Response("not-json", { headers: { "content-type": "application/json" } })],
  ["partial dictionary", () => jsonResponse({ navigation: { applications: "incomplete" } })],
  [
    "wrong leaf type",
    () =>
      jsonResponse({ ...he, settings: { ...he.settings, preferences: { ...he.settings.preferences, dismiss: 4 } } }),
  ],
  ["unexpected field", () => jsonResponse({ ...he, unexpected: "private" })],
  ["array payload", () => jsonResponse([])],
] as const)("rejects %s without activating or storing the requested locale", async (_reason, response) => {
  fetchDictionary.mockResolvedValueOnce(response());
  await expect(changeLocale("he")).rejects.toThrow("The language resources could not be loaded");
  expect(i18n.resolvedLanguage).toBe("en");
  expect(document.documentElement.lang).toBe("en");
  expect(document.documentElement.dir).toBe("ltr");
  expect(readLocalUserPreferences().language).toBe("en");
});

test("a dictionary fetch completing after ownership changes cannot activate", async () => {
  let ownerId = 1;
  let complete!: (response: Response) => void;
  fetchDictionary.mockReturnValueOnce(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  const applied = changeLocale("he", { shouldApply: () => ownerId === 1 });
  await vi.waitFor(() => expect(fetchDictionary).toHaveBeenCalledOnce());
  ownerId = 2;
  complete(jsonResponse());
  expect(await applied).toBe(false);
  expect(i18n.resolvedLanguage).toBe("en");
  expect(document.documentElement.dir).toBe("ltr");
});
