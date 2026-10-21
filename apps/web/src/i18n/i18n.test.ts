import { beforeEach, describe, expect, test } from "vitest";
import { readLocalUserPreferences, writeLocalUserPreferences } from "../lib/user-preferences";
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

test.each(["en", "ru", "uk", "he"] as const)("initializes document language and direction for %s", async (locale) => {
  writeLocalUserPreferences({ language: locale });
  await initializeI18n();

  expect(document.documentElement.lang).toBe(locale);
  expect(document.documentElement.dir).toBe(locale === "he" ? "rtl" : "ltr");
});

test.each(["en", "ru", "uk", "he"] as const)(
  "updates document language and direction when selecting %s",
  async (locale) => {
    await changeLocale(locale);

    expect(document.documentElement.lang).toBe(locale);
    expect(document.documentElement.dir).toBe(locale === "he" ? "rtl" : "ltr");
  },
);

test("loads the Hebrew dictionary and applies right-to-left direction", async () => {
  await changeLocale("he");

  expect(i18n.t("navigation.applications")).toBe("מועמדויות");
  expect(i18n.t("auth.login.submit")).toBe("כניסה");
  expect(document.documentElement.dir).toBe("rtl");

  await changeLocale("en");
  expect(document.documentElement.dir).toBe("ltr");
});

test.each([
  { locale: "en", save: "Save changes", discard: "Discard changes", keep: "Keep editing" },
  { locale: "ru", save: "Сохранить изменения", discard: "Отменить изменения", keep: "Продолжить редактирование" },
  { locale: "uk", save: "Зберегти зміни", discard: "Відхилити зміни", keep: "Продовжити редагування" },
  { locale: "he", save: "שמירת השינויים", discard: "ביטול השינויים", keep: "המשך עריכה" },
] as const)("localizes distinct unsaved-edit choices for $locale", async ({ locale, save, discard, keep }) => {
  await changeLocale(locale);

  expect(i18n.t("applications.workspace.actions.saveChanges")).toBe(save);
  expect(i18n.t("applications.workspace.actions.discardChanges")).toBe(discard);
  expect(i18n.t("applications.workspace.actions.keepEditing")).toBe(keep);
});
