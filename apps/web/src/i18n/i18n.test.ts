import { beforeEach, describe, expect, test } from "vitest";
import { readLocalUserPreferences } from "../lib/user-preferences";
import { changeLocale, i18n, initializeI18n, languageStorageKey, resolveLocale } from "./i18n";

beforeEach(async () => {
  await initializeI18n();
});

describe("resolveLocale", () => {
  test("prefers a supported saved preference", () => {
    expect(resolveLocale("ru", "uk-UA")).toBe("ru");
  });

  test.each([
    [null, "uk-UA", "uk"],
    [null, "ru-RU", "ru"],
    [null, "en-GB", "en"],
    ["fr", "de-DE", "en"],
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
