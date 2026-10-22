import { beforeEach, expect, test } from "vitest";
import { readLocalUserPreferences } from "../lib/user-preferences";
import { initializeTestI18n } from "../test/initialize-test-i18n";
import { changeLocale, i18n } from "./i18n";

beforeEach(async () => {
  await initializeTestI18n();
  await changeLocale("he");
  await changeLocale("uk");
  await changeLocale("en");
});

test("commits an already-loaded locale and document before a queued owner change", async () => {
  let ownerId = 1;
  const applied = changeLocale("he", { shouldApply: () => ownerId === 1 });
  queueMicrotask(() => {
    ownerId = 2;
  });

  const result = await applied;

  expect(ownerId).toBe(2);
  expect(i18n.resolvedLanguage).toBe("he");
  expect(document.documentElement.lang).toBe("he");
  expect(document.documentElement.dir).toBe("rtl");
  expect(readLocalUserPreferences().language).toBe("he");
  expect(result).toBe(true);
});

test("an older activation completion cannot overwrite a newer valid locale", async () => {
  let newerActivation: Promise<boolean> | undefined;
  function selectNewerLocale(locale: string) {
    if (locale === "he") {
      newerActivation = changeLocale("uk");
    }
  }
  i18n.on("languageChanged", selectNewerLocale);
  try {
    await changeLocale("he");
    await newerActivation;
    expect(i18n.resolvedLanguage).toBe("uk");
    expect(document.documentElement.lang).toBe("uk");
    expect(document.documentElement.dir).toBe("ltr");
    expect(readLocalUserPreferences().language).toBe("uk");
  } finally {
    i18n.off("languageChanged", selectNewerLocale);
  }
});
