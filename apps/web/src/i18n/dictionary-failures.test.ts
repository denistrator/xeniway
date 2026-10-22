import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { readLocalUserPreferences, writeLocalUserPreferences } from "../lib/user-preferences";
import { changeLocale, i18n, initializeI18n } from "./i18n";
import he from "./locales/he";

const fetchDictionary = vi.fn<typeof fetch>();

beforeEach(async () => {
  fetchDictionary.mockReset();
  fetchDictionary.mockImplementation(
    async () =>
      new Response(JSON.stringify(he), {
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchDictionary);
  await initializeI18n();
  await changeLocale("en");
  i18n.removeResourceBundle("he", "translation");
});

afterEach(() => vi.unstubAllGlobals());

test("renders startup in bundled English when a stored dictionary fails without replacing the preference", async () => {
  writeLocalUserPreferences({ language: "he" });
  fetchDictionary.mockImplementation(async () => {
    throw new Error("private dictionary resource URL");
  });
  await expect(initializeI18n()).resolves.toBeUndefined();
  expect(i18n.resolvedLanguage).toBe("en");
  expect(document.documentElement.lang).toBe("en");
  expect(document.documentElement.dir).toBe("ltr");
  expect(readLocalUserPreferences().language).toBe("he");
});

test("a slower resource selection cannot overwrite a newer explicit English choice", async () => {
  await Promise.all([changeLocale("he"), changeLocale("en")]);
  expect(i18n.resolvedLanguage).toBe("en");
  expect(document.documentElement.lang).toBe("en");
  expect(document.documentElement.dir).toBe("ltr");
  expect(readLocalUserPreferences().language).toBe("en");
});

test("a cancelled account dictionary cannot apply after ownership changes", async () => {
  await changeLocale("he", { shouldApply: () => false });
  expect(i18n.resolvedLanguage).toBe("en");
  expect(document.documentElement.dir).toBe("ltr");
  expect(readLocalUserPreferences().language).toBe("en");
});

test("an already cancelled account change cannot supersede a valid pending user choice", async () => {
  await Promise.all([changeLocale("he"), changeLocale("ru", { source: "account", shouldApply: () => false })]);
  expect(i18n.resolvedLanguage).toBe("he");
  expect(document.documentElement.dir).toBe("rtl");
});
