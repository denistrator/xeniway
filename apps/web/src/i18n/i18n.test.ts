import { beforeEach, describe, expect, test } from "vitest";
import { readLocalUserPreferences } from "../lib/user-preferences";
import { changeLocale, i18n, initializeI18n, languageStorageKey, resolveLocale } from "./i18n";

beforeEach(async () => {
  await initializeI18n();
});

describe("resolveLocale", () => {
  test("prefers a supported saved preference", () => {
    expect(resolveLocale("ru", "uk-UA")).toBe("ru");
    expect(resolveLocale("he", "en-US")).toBe("he");
  });

  test.each([
    [null, "uk-UA", "uk"],
    [null, "ru-RU", "ru"],
    [null, "en-GB", "en"],
    ["fr", "de-DE", "en"],
    [null, "he-IL", "he"],
  ])("resolves %s and %s as %s", (stored, browserLanguage, expected) => {
    expect(resolveLocale(stored, browserLanguage)).toBe(expected);
  });
});

test("loads and stores an explicitly selected locale", async () => {
  await changeLocale("uk");

  expect(i18n.resolvedLanguage).toBe("uk");
  expect(window.localStorage.getItem(languageStorageKey)).toContain('"language":"uk"');
  expect(readLocalUserPreferences().language).toBe("uk");
});

test("loads the Hebrew dictionary and applies right-to-left direction", async () => {
  await changeLocale("he");

  expect(i18n.t("navigation.applications")).toBe("מועמדויות");
  expect(i18n.t("auth.login.submit")).toBe("כניסה");
  expect(document.documentElement.dir).toBe("rtl");

  await changeLocale("en");
  expect(document.documentElement.dir).toBe("ltr");
});
